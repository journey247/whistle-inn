import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { message } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // TODO: Call the AI agent server
        // For now, return a placeholder response
        return NextResponse.json({
            message: `I received your message: "${message}". The AI agent integration is coming soon!`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('AI chat error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}