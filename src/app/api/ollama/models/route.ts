import { NextResponse } from 'next/server';

const OLLAMA_API_BASE = process.env.OLLAMA_API_BASE || 'http://localhost:11434';

export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_API_BASE}/api/tags`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch Ollama models');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying Ollama models request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
} 