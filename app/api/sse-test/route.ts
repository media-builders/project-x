export const runtime = 'nodejs'; // important: long-lived connection

export async function GET() {
  const encoder = new TextEncoder();

  // Create a streaming response
  const stream = new ReadableStream({
    start(controller) {
      // Helper: write one SSE message
      const send = (obj: any) => {
        const payload = `data: ${JSON.stringify(obj)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Optional: tell client to retry in 3s on disconnect
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));

      // Heartbeat to keep proxies alive (every 15s is common)
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`)); // comment line = heartbeat
      }, 15000);

      // Demo messages
      let tick = 0;
      const interval = setInterval(() => {
        send({ tick: ++tick, at: new Date().toISOString() });
        if (tick >= 5) {
          clearInterval(interval);
          clearInterval(heartbeat);
          controller.close(); // end the stream after 5 messages
        }
      }, 1000);
    },
    cancel() {
      // client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // CORS if needed:
      // 'Access-Control-Allow-Origin': '*',
    },
  });
}
