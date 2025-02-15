import { NextResponse } from 'next/server';

const OLLAMA_API_BASE = process.env.OLLAMA_API_BASE || 'http://127.0.0.1:11434';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log(`${OLLAMA_API_BASE}/v1/chat/completions`)
    const response = await fetch(`${OLLAMA_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to generate Ollama response');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying Ollama request:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 