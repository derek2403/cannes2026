import { useState } from "react";

interface ApiResult {
  success: boolean;
  [key: string]: unknown;
}

const btnStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "8px 18px",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: 600 as const,
};

export default function StoragePage() {
  // Upload state
  const [uploadContent, setUploadContent] = useState(
    '{"type":"knowledge-item","domain":"0g-storage","content":"Use SDK v1.2+. Content-addressed storage with Merkle tree verification.","author":"0g-agent-001"}'
  );
  const [uploadEncrypt, setUploadEncrypt] = useState(false);
  const [uploadResult, setUploadResult] = useState<ApiResult | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Download state
  const [rootHash, setRootHash] = useState("");
  const [downloadDecrypt, setDownloadDecrypt] = useState(false);
  const [downloadResult, setDownloadResult] = useState<ApiResult | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // KV state
  const [kvKey, setKvKey] = useState("0g-storage:merkle-verification");
  const [kvValue, setKvValue] = useState(
    "Use SDK v0.48+. The token transfer bug in v0.47 was fixed."
  );
  const [kvResult, setKvResult] = useState<ApiResult | null>(null);
  const [kvLoading, setKvLoading] = useState(false);

  async function callApi(
    endpoint: string,
    body: Record<string, string>
  ): Promise<ApiResult> {
    const res = await fetch(`/api/storage/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function handleUpload() {
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const res = await fetch("/api/storage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: uploadContent, encrypted: uploadEncrypt }),
      });
      const result = await res.json();
      setUploadResult(result);
      if (result.success && result.rootHash) {
        setRootHash(result.rootHash as string);
      }
    } catch (err) {
      setUploadResult({ success: false, error: String(err) });
    }
    setUploadLoading(false);
  }

  async function handleDownload() {
    if (!rootHash) {
      setDownloadResult({ success: false, error: "Enter a root hash first" });
      return;
    }
    setDownloadLoading(true);
    setDownloadResult(null);
    try {
      const res = await fetch("/api/storage/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootHash, decrypt: downloadDecrypt }),
      });
      const result = await res.json();
      setDownloadResult(result);
    } catch (err) {
      setDownloadResult({ success: false, error: String(err) });
    }
    setDownloadLoading(false);
  }

  async function handleKvWrite() {
    setKvLoading(true);
    setKvResult(null);
    try {
      const result = await callApi("kv-write", { key: kvKey, value: kvValue });
      setKvResult(result);
    } catch (err) {
      setKvResult({ success: false, error: String(err) });
    }
    setKvLoading(false);
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "40px auto",
        fontFamily: "monospace",
        padding: "0 20px",
        background: "#fff",
        color: "#000",
      }}
    >
      <h1>0G Storage Demo</h1>
      <p style={{ color: "#000" }}>
        Decentralized, immutable, content-addressed storage via 0G Storage SDK
      </p>
      <p style={{ color: "#000", fontSize: 12 }}>
        Indexer: indexer-storage-testnet-turbo.0g.ai | RPC:
        evmrpc-testnet.0g.ai
      </p>

      <hr style={{ margin: "24px 0" }} />

      {/* 1. Upload Content */}
      <section style={{ margin: "24px 0" }}>
        <h2>1. Upload Knowledge Content</h2>
        <p style={{ color: "#000", fontSize: 13 }}>
          Upload a SPARK knowledge item to 0G Storage. Returns an immutable
          Merkle root hash. Content is erasure-coded across the storage network.
        </p>
        <div>
          <label>
            Content (JSON or text):
            <br />
            <textarea
              value={uploadContent}
              onChange={(e) => setUploadContent(e.target.value)}
              style={{
                width: "100%",
                height: 100,
                fontFamily: "monospace",
                fontSize: 12,
                marginTop: 4,
              }}
            />
          </label>
        </div>
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: uploadEncrypt ? "#fffbeb" : "#f8fafc",
            border: uploadEncrypt ? "2px solid #f59e0b" : "1px solid #e2e8f0",
            borderRadius: 6,
          }}
        >
          <label style={{ cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={uploadEncrypt}
              onChange={(e) => setUploadEncrypt(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <strong>Encrypt before upload</strong> (AES-256-GCM)
          </label>
          <p style={{ color: "#000", fontSize: 11, margin: "4px 0 0 24px" }}>
            Content is encrypted server-side before uploading to 0G Storage.
            Only this SPARK node can decrypt it.
          </p>
        </div>
        <button
          onClick={handleUpload}
          disabled={uploadLoading}
          style={{ ...btnStyle, marginTop: 8, opacity: uploadLoading ? 0.6 : 1 }}
        >
          {uploadLoading
            ? "Uploading to 0G..."
            : uploadEncrypt
              ? "Encrypt & Upload to 0G Storage"
              : "Upload to 0G Storage"}
        </button>
        {uploadResult && <ResultBlock data={uploadResult} />}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* 2. Download Content */}
      <section style={{ margin: "24px 0" }}>
        <h2>2. Download by Root Hash</h2>
        <p style={{ color: "#000", fontSize: 13 }}>
          Retrieve content from 0G Storage using its Merkle root hash. Includes
          cryptographic proof verification — the content is guaranteed authentic
          and untampered.
        </p>
        <div>
          <label>
            Root Hash:{" "}
            <input
              value={rootHash}
              onChange={(e) => setRootHash(e.target.value)}
              placeholder="0x..."
              style={{ width: 500, fontFamily: "monospace", fontSize: 11 }}
            />
          </label>
        </div>
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: downloadDecrypt ? "#fffbeb" : "#f8fafc",
            border: downloadDecrypt ? "2px solid #f59e0b" : "1px solid #e2e8f0",
            borderRadius: 6,
          }}
        >
          <label style={{ cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              checked={downloadDecrypt}
              onChange={(e) => setDownloadDecrypt(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <strong>Decrypt after download</strong> (AES-256-GCM)
          </label>
          <p style={{ color: "#000", fontSize: 11, margin: "4px 0 0 24px" }}>
            Decrypt content that was encrypted before upload. Fails if content
            is not encrypted or key mismatch.
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloadLoading}
          style={{ ...btnStyle, marginTop: 8, opacity: downloadLoading ? 0.6 : 1 }}
        >
          {downloadLoading
            ? "Downloading from 0G..."
            : downloadDecrypt
              ? "Download & Decrypt"
              : "Download & Verify"}
        </button>
        {downloadResult && <ResultBlock data={downloadResult} />}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* 3. KV Storage */}
      <section style={{ margin: "24px 0" }}>
        <h2>3. Knowledge Key-Value Store</h2>
        <p style={{ color: "#000", fontSize: 13 }}>
          Store a knowledge key-value pair on 0G Storage. Each entry is
          immutable and content-addressed via Merkle tree root hashes.
        </p>
        <div>
          <label>
            Key:{" "}
            <input
              value={kvKey}
              onChange={(e) => setKvKey(e.target.value)}
              style={{ width: 350, fontFamily: "monospace" }}
            />
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <label>
            Value:{" "}
            <input
              value={kvValue}
              onChange={(e) => setKvValue(e.target.value)}
              style={{ width: 500, fontFamily: "monospace", fontSize: 12 }}
            />
          </label>
        </div>
        <button
          onClick={handleKvWrite}
          disabled={kvLoading}
          style={{ ...btnStyle, marginTop: 8, opacity: kvLoading ? 0.6 : 1 }}
        >
          {kvLoading ? "Storing..." : "Store Key-Value"}
        </button>
        {kvResult && <ResultBlock data={kvResult} />}
      </section>

      <hr style={{ margin: "24px 0" }} />

      {/* Info */}
      <section style={{ margin: "24px 0" }}>
        <h2>How SPARK Uses 0G Storage</h2>
        <pre
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: 16,
            fontSize: 12,
            overflow: "auto",
          }}
        >
          {`Knowledge item created (v1):
  Upload content → 0G Storage → root hash: 0xabc...

Knowledge item updated (v2):
  Upload new version → 0G Storage → root hash: 0xdef...

Verification:
  1. Download from 0G Storage (by root hash)
  2. Merkle tree verification ensures content integrity
  3. Content is authentic and untampered`}
        </pre>
      </section>
    </div>
  );
}

function ResultBlock({ data }: { data: ApiResult }) {
  return (
    <pre
      style={{
        background: data.success ? "#f0fdf4" : "#fef2f2",
        border: `1px solid ${data.success ? "#86efac" : "#fca5a5"}`,
        padding: 12,
        marginTop: 8,
        overflow: "auto",
        fontSize: 13,
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
