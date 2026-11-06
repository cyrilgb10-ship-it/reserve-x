self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;

  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Reserve X",
      message: event.data.text(),
    };
  }

  const title = data.title || "Reserve X";

  const options = {
    body: data.message || "Vous avez une nouvelle notification.",
    tag: data.tag || "reserve-x-notification",
    renotify: false,
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl;

  try {
    targetUrl = new URL(
      event.notification.data?.url || "/",
      self.location.origin,
    );
  } catch {
    targetUrl = new URL("/", self.location.origin);
  }

  // Empêche toute redirection vers un domaine externe.
  if (targetUrl.origin !== self.location.origin) {
    targetUrl = new URL("/", self.location.origin);
  }

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then(async (clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          await client.navigate(targetUrl.href);
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl.href);
    }),
  );
});