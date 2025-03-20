figma.showUI(__html__, { width: 500, height: 600 });

async function loadStoredNames() {
  const storedNames = await figma.clientStorage.getAsync("nameList") || [];
  console.log("Loaded stored names:", storedNames);
  figma.ui.postMessage({ type: "load-names", names: storedNames });
}

loadStoredNames();

// Listen for selection changes and send the frame count.
figma.on("selectionchange", () => {
  const selectedFrames = figma.currentPage.selection.filter(node => node.type === "FRAME");
  figma.ui.postMessage({ type: "selection-status", frameCount: selectedFrames.length });
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === "export-sitemap") {
    try {
      const textLayer = figma.createText();
      const font = { family: "Roboto", style: "Regular" };
      await figma.loadFontAsync(font);
      textLayer.fontName = font;
      textLayer.characters = msg.content;
      textLayer.fontSize = 16;
      textLayer.textAutoResize = "HEIGHT";
      figma.currentPage.appendChild(textLayer);
      const viewportCenter = figma.viewport.center;
      textLayer.x = viewportCenter.x - textLayer.width / 2;
      textLayer.y = viewportCenter.y - textLayer.height / 2;
      figma.notify("Sitemap exported and centered in the viewport!");
    } catch (error) {
      figma.notify("Failed to export sitemap. Please try again.");
      console.error("Export error:", error);
    }
  }
  if (msg.type === "import-text-frame") {
    const selectedTextFrame = figma.currentPage.selection.find(node => node.type === "TEXT");
    if (!selectedTextFrame) {
      figma.notify("Select a text frame to import names.");
      return;
    }
    let names = selectedTextFrame.characters.split("\n").filter(Boolean);
    names = names.map(line => line.replace(/^\s*\S+\s/, "").trim());
    await figma.clientStorage.setAsync("nameList", names);
    figma.ui.postMessage({ type: "load-names", names });
    figma.notify("Names imported successfully!");
  }
  if (msg.type === "update-names") {
    // Save the updated text from the textarea to clientStorage.
    await figma.clientStorage.setAsync("nameList", msg.names);
  }
  if (msg.type === "rename-frames") {
    const selectedFrames = figma.currentPage.selection.filter(node => node.type === "FRAME");
    if (selectedFrames.length === 0) {
      figma.notify("Select at least one frame.");
      return;
    }
    const selectedNames = msg.selectedNames;
    if (!selectedNames || selectedNames.length === 0) {
      figma.notify("Select one or more names from the list first.");
      return;
    }
    const count = Math.min(selectedNames.length, selectedFrames.length);
    for (let i = 0; i < count; i++) {
      selectedFrames[i].name = selectedNames[i];
    }
    console.log(`Renamed ${count} frame(s)`);
    figma.notify(`Renamed ${count} frame(s)`);
  }
  if (msg.type === "check-selection") {
    const selectedFrames = figma.currentPage.selection.filter(node => node.type === "FRAME");
    figma.ui.postMessage({ type: "selection-status", frameCount: selectedFrames.length });
  }
};
