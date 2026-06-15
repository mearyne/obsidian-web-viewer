import React from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw, THEME } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const roots = new WeakMap();

function normalizeScene(scene, theme) {
  const appState = scene && typeof scene.appState === "object" && scene.appState ? scene.appState : {};
  return {
    elements: Array.isArray(scene?.elements) ? scene.elements.filter(Boolean) : [],
    appState: {
      ...appState,
      collaborators: [],
      currentChartType: "bar",
      name: appState.name || "Excalidraw",
      theme,
      viewBackgroundColor: appState.viewBackgroundColor || (theme === THEME.DARK ? "#121212" : "#ffffff"),
      viewModeEnabled: true,
      zenModeEnabled: true,
    },
    files: scene && typeof scene.files === "object" && scene.files ? scene.files : {},
  };
}

export function renderExcalidrawPreview(container, scene, options = {}) {
  if (!container) return;
  const theme = options.theme === "dark" ? THEME.DARK : THEME.LIGHT;
  const initialData = normalizeScene(scene, theme);
  const mount = document.createElement("div");
  mount.className = "excalidraw-react-mount";

  const previousRoot = roots.get(container);
  if (previousRoot) previousRoot.unmount();

  container.replaceChildren(mount);
  const root = createRoot(mount);
  roots.set(container, root);
  root.render(
    <Excalidraw
      key={options.path || "excalidraw-preview"}
      initialData={initialData}
      viewModeEnabled
      zenModeEnabled
      detectScroll={false}
      handleKeyboardGlobally={false}
      theme={theme}
      UIOptions={{
        canvasActions: {
          changeViewBackgroundColor: false,
          clearCanvas: false,
          export: false,
          loadScene: false,
          saveAsImage: false,
          saveToActiveFile: false,
          toggleTheme: false,
        },
        tools: {
          image: false,
        },
      }}
    />,
  );
}
