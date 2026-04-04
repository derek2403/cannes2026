import type { NextApiRequest, NextApiResponse } from 'next';

interface RegisterAgentBody {
    agentName?: string;
    ownerAddress: string;
    domainTags: string;
    serviceOfferings: string;
    modelProvider: string;
    systemPrompt: string;
    reputation: number;
}

interface RegisterAgentResponse {
    success: boolean;
    message: string;
    agentId?: string;
    data?: unknown;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<RegisterAgentResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const body = req.body as RegisterAgentBody;

    // Validate required fields
    if (!body.ownerAddress || !body.domainTags || !body.serviceOfferings || !body.modelProvider || !body.systemPrompt) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        // Forward to upstream service if configured, otherwise return mock success
        const upstreamUrl = process.env.AGENT_REGISTRY_URL;

        if (upstreamUrl) {
            const upstream = await fetch(`${upstreamUrl}/api/inft/register-agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await upstream.json();

            if (!upstream.ok) {
                return res.status(upstream.status).json({
                    success: false,
                    message: data.message || 'Upstream registration failed',
                    data,
                });
            }

            return res.status(200).json({ success: true, message: 'Agent registered', ...data });
        }

        // Mock response for local development
        const agentId = `agent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        return res.status(200).json({
            success: true,
            message: 'Agent registered successfully',
            agentId,
            data: {
                agentName: body.agentName || agentId,
                ownerAddress: body.ownerAddress,
                domainTags: body.domainTags.split(',').map((t) => t.trim()),
                serviceOfferings: body.serviceOfferings.split(',').map((s) => s.trim()),
                modelProvider: body.modelProvider,
                reputation: body.reputation,
                registeredAt: new Date().toISOString(),
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return res.status(500).json({ success: false, message });
    }
}
