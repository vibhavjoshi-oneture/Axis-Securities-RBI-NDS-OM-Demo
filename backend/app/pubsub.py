"""
Pure asyncio pub/sub broker.

No external libraries — uses asyncio.Queue per subscriber per topic.
Topics are free-form strings (e.g. "order:ASL-DEMO-1001", "securities", "funds:ASL-DEMO-1001").
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any, AsyncGenerator, Dict, List


class PubSub:
    """
    Lightweight in-process publish/subscribe broker.

    Each subscriber gets its own asyncio.Queue so events are delivered
    independently and a slow consumer never blocks others.
    """

    def __init__(self) -> None:
        # topic -> list of queues (one per active subscriber)
        self._subscribers: Dict[str, List[asyncio.Queue]] = defaultdict(list)

    async def publish(self, topic: str, payload: Any) -> None:
        """Publish *payload* to every subscriber currently listening on *topic*."""
        for queue in list(self._subscribers.get(topic, [])):
            await queue.put(payload)

    def publish_sync(self, topic: str, payload: Any) -> None:
        """
        Thread-safe fire-and-forget publish.

        Use this from synchronous code (resolvers) that may run outside the
        event loop.  It schedules the coroutine onto the running loop.
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(self.publish(topic, payload))
            else:
                loop.run_until_complete(self.publish(topic, payload))
        except RuntimeError:
            # No event loop in this thread — best-effort skip.
            pass

    async def subscribe(self, topic: str) -> AsyncGenerator[Any, None]:
        """
        Async generator that yields every event published to *topic*.

        Automatically unregisters the subscriber when the generator is closed.
        """
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers[topic].append(queue)
        try:
            while True:
                payload = await queue.get()
                yield payload
        finally:
            # Clean up on client disconnect / generator close
            try:
                self._subscribers[topic].remove(queue)
            except ValueError:
                pass


# Module-level singleton shared across the whole process
pubsub = PubSub()
