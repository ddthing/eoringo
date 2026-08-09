(() => {
  const root = document.documentElement;
  let appearanceMode = "system";

  try {
    const persistedTheme = JSON.parse(
      localStorage.getItem("ff14-daily-board/theme") || "null",
    );
    const persistedMode = persistedTheme?.state?.appearanceMode;

    if (persistedMode === "light" || persistedMode === "dark") {
      appearanceMode = persistedMode;
    }
  } catch {
    appearanceMode = "system";
  }

  const resolvedMode =
    appearanceMode === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : appearanceMode;

  root.dataset.colorMode = resolvedMode;
  root.classList.toggle("dark", resolvedMode === "dark");
  root.style.colorScheme = resolvedMode;

  if (resolvedMode === "dark") {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#15181d");
  }
})();
