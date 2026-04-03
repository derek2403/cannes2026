import type { NextApiRequest, NextApiResponse } from "next";
import { getComputeBroker } from "@/lib/0g-compute";
import fs from "fs";
import path from "path";
import os from "os";
import FormData from "form-data";
import axios from "axios";
import { ethers } from "ethers";

/**
 * Manual TEE upload — bypasses SDK's uploadDatasetToTEE which has a
 * broken `require('form-data').default` in Next.js server environment.
 * Replicates the exact same HTTP request the SDK would make.
 */
async function uploadDatasetManual(
  providerUrl: string,
  userAddress: string,
  signer: ethers.Signer,
  datasetPath: string
): Promise<{ datasetHash: string; message: string }> {
  const endpoint = `${providerUrl}/v1/user/${userAddress}/dataset`;
  const fileName = path.basename(datasetPath);

  // Sign: keccak256(userAddress + timestamp)
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${userAddress}${timestamp}`;
  const hash = ethers.keccak256(ethers.toUtf8Bytes(message));
  const signature = await signer.signMessage(ethers.toBeArray(hash));

  const formData = new FormData();
  formData.append("file", fs.createReadStream(datasetPath), {
    filename: fileName,
    contentType: "application/octet-stream",
  });
  formData.append("signature", signature);
  formData.append("timestamp", timestamp.toString());

  const response = await axios({
    method: "post",
    url: endpoint,
    data: formData,
    headers: formData.getHeaders(),
    timeout: 90000,
  });

  return response.data;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { provider: providerAddress, model, dataset, trainingParams } = req.body;

  if (!providerAddress || !model) {
    return res
      .status(400)
      .json({ error: "provider and model are required" });
  }

  if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
    return res.status(400).json({
      error:
        "dataset is required (array of {instruction, input, output} objects)",
    });
  }

  let tmpDatasetPath = "";
  let tmpTrainingPath = "";

  let step = "init";
  try {
    step = "get-broker";
    const broker = await getComputeBroker();
    if (!broker.fineTuning) {
      return res
        .status(500)
        .json({ success: false, error: "Fine-tuning broker not available" });
    }

    // 1. Acknowledge provider if not already done
    step = "list-services";
    const services = await broker.fineTuning.listService(true);
    const svc = services.find(
      (s) => s.provider.toLowerCase() === providerAddress.toLowerCase()
    );
    if (!svc) {
      return res
        .status(400)
        .json({ success: false, error: "Provider not found" });
    }
    if (!svc.teeSignerAcknowledged) {
      step = "acknowledge-signer";
      await broker.fineTuning.acknowledgeProviderSigner(providerAddress);
    }

    // 2. Write dataset to temp JSONL file
    step = "write-dataset";
    const tmpDir = os.tmpdir();
    tmpDatasetPath = path.join(tmpDir, `0g-ft-dataset-${Date.now()}.jsonl`);
    const jsonlContent = dataset
      .map((item: Record<string, string>) => JSON.stringify(item))
      .join("\n");
    fs.writeFileSync(tmpDatasetPath, jsonlContent, "utf-8");

    // 3. Write training params to temp JSON file
    step = "write-params";
    const defaultTrainingParams = {
      neftune_noise_alpha: 5,
      num_train_epochs: 1,
      per_device_train_batch_size: 2,
      learning_rate: 0.0002,
      max_steps: 3,
      ...(trainingParams || {}),
    };
    tmpTrainingPath = path.join(tmpDir, `0g-ft-params-${Date.now()}.json`);
    fs.writeFileSync(
      tmpTrainingPath,
      JSON.stringify(defaultTrainingParams),
      "utf-8"
    );

    // 4. Upload dataset to TEE (manual — bypasses broken SDK FormData)
    step = "upload-dataset-to-tee";
    const privateKey = process.env.ZG_STORAGE_PRIVATE_KEY!;
    const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
    const wallet = new ethers.Wallet(privateKey, provider);
    const userAddress = wallet.address;

    const uploadResult = await uploadDatasetManual(
      svc.url,
      userAddress,
      wallet,
      tmpDatasetPath
    );

    // 5. Create fine-tuning task
    step = "create-task";
    const taskId = await broker.fineTuning.createTask(
      providerAddress,
      model,
      uploadResult.datasetHash,
      tmpTrainingPath
    );

    return res.status(200).json({
      success: true,
      taskId,
      datasetHash: uploadResult.datasetHash,
      model,
      provider: providerAddress,
      trainingParams: defaultTrainingParams,
      message: `Fine-tuning task created: ${taskId}`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ success: false, error: msg, step });
  } finally {
    // Cleanup temp files
    if (tmpDatasetPath && fs.existsSync(tmpDatasetPath)) {
      fs.unlinkSync(tmpDatasetPath);
    }
    if (tmpTrainingPath && fs.existsSync(tmpTrainingPath)) {
      fs.unlinkSync(tmpTrainingPath);
    }
  }
}
