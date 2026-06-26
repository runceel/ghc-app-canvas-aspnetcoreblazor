(() => {
    const subscriptions = new Map();
    let nextSubscriptionId = 1;

    function start(url, dotNetRef) {
        if (typeof url !== "string" || !url.trim()) {
            throw new Error("A non-empty SSE URL is required.");
        }

        const source = new EventSource(url);
        const subscriptionId = nextSubscriptionId++;

        source.onopen = () => {
            void dotNetRef.invokeMethodAsync("OnSseOpen");
        };

        source.onerror = () => {
            void dotNetRef.invokeMethodAsync("OnSseError");
        };

        source.onmessage = (event) => {
            const payload = typeof event.data === "string" ? event.data : "";
            void dotNetRef.invokeMethodAsync("OnSseMessage", payload);
        };

        subscriptions.set(subscriptionId, { source });
        return subscriptionId;
    }

    function stop(subscriptionId) {
        const entry = subscriptions.get(subscriptionId);
        if (!entry) {
            return;
        }

        entry.source.close();
        subscriptions.delete(subscriptionId);
    }

    window.sampleEvents = {
        start,
        stop,
    };
})();
