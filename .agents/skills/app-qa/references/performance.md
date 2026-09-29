# Performance

Measure, do not guess. Record numbers and the conditions (device, network, cold/warm cache).

## Web
- Lighthouse (mobile profile) for LCP, CLS, INP/TBT, total transfer size. Note scores and the top opportunities.
- Network log: oversized images, uncompressed assets, duplicate requests, request waterfalls, N+1 API calls, missing caching
- Main-thread jank while scrolling or typing; memory growth after repeated navigation
- Throttled network (Slow 4G) and CPU (4x slowdown) pass on the core journey

## API / backend
- Response time of key endpoints under normal use; anything over ~500ms for simple reads deserves a note
- Slow queries, missing pagination on large lists, unbounded responses
- Behavior under modest concurrency (Open tier only; keep it small unless the user asks for a load test)

## Mobile native
- Cold start time, screen transition smoothness, memory/CPU during core flows (`adb shell dumpsys`, Xcode Instruments if available), battery-heavy behavior (constant polling, wake locks), app size

## Reporting
Give before/after numbers if you fix something. "Faster" without numbers is not evidence.
