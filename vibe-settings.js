/* Vibe settings: all setting data and profile images use the existing musicvibe2 Supabase Storage bucket. */
(() => {
  const SUPABASE_URL = "https://ljmqyigdesrftfphiglw.supabase.co";
  const SUPABASE_KEY = "sb_publishable_AMFZFIODLrc7YIF0SUAh0w_ZlQuONWn";
  const BUCKET = "musicvibe2";
  if (!window.supabase) {
    console.error("Supabase JS did not load. Include the Supabase v2 CDN before vibe-settings.js.");
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  // This ID only identifies this browser's files; settings themselves are stored in the musicvibe2 bucket.
  let clientId = localStorage.getItem("musicvibe2_client_id");
  if (!clientId) {
    clientId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "vibe-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem("musicvibe2_client_id", clientId);
  }
  const folder = "vibe-settings/" + clientId;
  const settingsPath = folder + "/settings.json";
  const defaultSettings = {
    name: "Gunasyam",
    email: "example@gmail.com",
    theme: "system",
    notifications: false,
    avatarPath: ""
  };
  let cachedSettings = { ...defaultSettings };

  async function loadSettings() {
    const { data, error } = await client.storage.from(BUCKET).download(settingsPath);
    if (error) {
      // A missing settings file is normal the first time. Other errors usually mean Storage policies need configuration.
      if (!/not found|404|object not found/i.test(error.message || "")) console.warn("Could not load Vibe settings from musicvibe2:", error.message);
      cachedSettings = { ...defaultSettings };
      applySettings(cachedSettings);
      return cachedSettings;
    }
    try {
      cachedSettings = { ...defaultSettings, ...JSON.parse(await data.text()) };
    } catch (e) {
      console.error("Settings file in musicvibe2 is not valid JSON:", e);
      cachedSettings = { ...defaultSettings };
    }
    applySettings(cachedSettings);
    return cachedSettings;
  }

  async function saveSettings(changes) {
    const next = { ...cachedSettings, ...changes };
    const file = new Blob([JSON.stringify(next, null, 2)], { type: "application/json" });
    const { error } = await client.storage.from(BUCKET).upload(settingsPath, file, {
      upsert: true,
      contentType: "application/json",
      cacheControl: "0"
    });
    if (error) throw new Error(error.message + " (Check Storage policies for the existing musicvibe2 bucket.)");
    cachedSettings = next;
    applySettings(next);
    return next;
  }

  async function loadAvatar() {
    if (!cachedSettings.avatarPath) return;
    const { data, error } = await client.storage.from(BUCKET).download(cachedSettings.avatarPath);
    if (error) { console.warn("Could not load profile picture:", error.message); return; }
    const url = URL.createObjectURL(data);
    document.querySelectorAll("[data-vibe-avatar], #profileImage").forEach(img => { img.src = url; });
  }

  async function uploadAvatar(file) {
    if (!file || !file.type.startsWith("image/")) throw new Error("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = folder + "/avatar." + ext;
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0"
    });
    if (error) throw new Error(error.message + " (Check Storage policies for the existing musicvibe2 bucket.)");
    await saveSettings({ avatarPath: path });
    await loadAvatar();
  }

  function applySettings(settings) {
    const theme = settings.theme || "system";
    const resolved = theme === "system"
      ? ((window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark")
      : theme;
    document.documentElement.setAttribute("data-theme", resolved);
    document.querySelectorAll('input[name="theme"]').forEach(input => { input.checked = input.value === theme; });
    const name = document.getElementById("name");
    if (name && settings.name) name.value = settings.name;
    const email = document.getElementById("email");
    if (email && settings.email) email.value = settings.email;
    const toggle = document.getElementById("notificationSwitch");
    if (toggle) {
      toggle.checked = !!settings.notifications;
      const status = document.getElementById("notificationStatus");
      if (status) status.textContent = toggle.checked ? "ON" : "OFF";
    }
    document.querySelectorAll("[data-vibe-name]").forEach(el => { el.textContent = settings.name || ""; });
    document.querySelectorAll("[data-vibe-email]").forEach(el => { el.textContent = settings.email || ""; });
  }

  function setStatus(message, isError=false) {
    let status = document.getElementById("vibeSaveStatus");
    if (!status) {
      status = document.createElement("p");
      status.id = "vibeSaveStatus";
      status.setAttribute("role", "status");
      status.style.cssText = "text-align:center;font-size:14px;color:" + (isError ? "#ff7777" : "#7ee787") + ";margin:12px auto;max-width:90%;";
      const anchor = document.querySelector("center") || document.querySelector(".container") || document.body;
      anchor.appendChild(status);
    }
    status.style.color = isError ? "#ff7777" : "#7ee787";
    status.textContent = message;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadSettings();
    await loadAvatar();
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    themeInputs.forEach(input => input.addEventListener("change", async () => {
      try { await saveSettings({ theme: input.value }); setStatus("Theme saved."); }
      catch (e) { setStatus("Could not save theme: " + e.message, true); }
    }));

    const notificationSwitch = document.getElementById("notificationSwitch");
    if (notificationSwitch) notificationSwitch.addEventListener("change", async () => {
      const status = document.getElementById("notificationStatus");
      if (status) status.textContent = notificationSwitch.checked ? "ON" : "OFF";
      try { await saveSettings({ notifications: notificationSwitch.checked }); setStatus("Notification preference saved."); }
      catch (e) { setStatus("Could not save notification preference: " + e.message, true); }
    });

    const saveButton = [...document.querySelectorAll("button")].find(button => /save changes/i.test(button.textContent));
    if (saveButton) saveButton.addEventListener("click", async event => {
      event.preventDefault();
      const name = document.getElementById("name");
      const email = document.getElementById("email");
      try {
        await saveSettings({ name: name ? name.value.trim() : cachedSettings.name, email: email ? email.value.trim() : cachedSettings.email });
        const fileInput = document.getElementById("profileFile");
        if (fileInput && fileInput.files && fileInput.files[0]) await uploadAvatar(fileInput.files[0]);
        setStatus("Profile saved to musicvibe2.");
      } catch (e) { setStatus("Could not save profile: " + e.message, true); }
    });

    const fileInput = document.getElementById("profileFile");
    if (fileInput) fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) {
        const preview = URL.createObjectURL(file);
        const image = document.getElementById("profileImage");
        if (image) image.src = preview;
      }
    });

    // Settings homepage logout is deliberately not wired to Supabase Auth because the supplied login page has no Supabase authentication.
    const logout = [...document.querySelectorAll("button")].find(button => /logout/i.test(button.textContent));
    if (logout) logout.addEventListener("click", () => {
      setStatus("Your supplied login page is not connected to Supabase Auth yet.", true);
    });
  });

  window.VibeSettings = { loadSettings, saveSettings, uploadAvatar, applySettings, getCachedSettings: () => ({ ...cachedSettings }) };
})();
