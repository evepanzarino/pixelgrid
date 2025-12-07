import { useEffect, useState, useRef } from "react";

export default function PixelGrid() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isDrawing, setIsDrawing] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [activeTool, setActiveTool] = useState("primary"); // "primary" or "secondary"
  const [showColorMenu, setShowColorMenu] = useState(true);
  const [showFileMenu, setShowFileMenu] = useState(false);
  
  const color = activeTool === "primary" ? primaryColor : secondaryColor;

  const cols = size.w;
  const rows = size.h;
  const totalPixels = Math.floor(cols * rows);
  const [pixelColors, setPixelColors] = useState(() => Array(totalPixels).fill("#ffffff"));

  const colorPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    function handleResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    const stopDrawing = () => setIsDrawing(false);

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointerup", stopDrawing);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointerup", stopDrawing);
    };
  }, []);

  function paintPixel(e, index) {
    setPixelColors((prev) => {
      const copy = [...prev];
      copy[index] = color;
      return copy;
    });
  }

  function normalizeHexInput(raw) {
    if (!raw) return "#";
    const v = raw.startsWith("#") ? raw.slice(1) : raw;
    return "#" + v.slice(0, 6);
  }

  function saveToHTML() {
    const data = JSON.stringify(pixelColors);
    const html = `
<body style="margin:0; overflow-x:hidden;">
<div style="display:grid;grid-template-columns:repeat(500,.5vw);grid-auto-rows:.5vw;">
${pixelColors.map(c => `<div style="width:.5vw;height:.5vw;background:${c}"></div>`).join("")}
</div>
<script>
const colors = ${data};
</script>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixel-art.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadFromHTML(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const match = text.match(/const colors = (\[[^;]+\])/);
      if (match) {
        const arr = JSON.parse(match[1]);
        setPixelColors(arr);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>

      {/* TOP BAR */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "4vw",
        background: "#ffffff",
        borderBottom: "0.3vw solid #444",
        display: "grid",
        alignItems: "center",
        gridTemplateColumns: "repeat(10, 10%)",
        zIndex: 20
      }}>
        <div className="logo">
          <img src="/android-chrome-512x512.png" alt="favicon" style={{
            justifyContent: "center",
          }} />
        </div>

        {/* FILE BUTTON */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFileMenu(v => !v)}
            style={{
              background: "#222",
              color: "white",
              border: "0.2vw solid #555",
              width: "100%",
              cursor: "pointer",
              fontSize: "2vw"
            }}
          >
            File
          </button>

          {showFileMenu && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              background: "#222",
              border: "0.25vw solid #555",
              borderRadius: "0.5vw",
              display: "grid",
              padding: "0.5vw 0",
              marginTop: "0.6vw",
              width: "100%",
              boxShadow: "0 0.6vw 2vw rgba(0,0,0,0.5)",
              zIndex: 30
            }}>
              <div
                onClick={() => {
                  setShowFileMenu(false);
                  saveToHTML();
                }}
                style={{
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  fontSize: ".9vw",
                  borderBottom: "0.2vw solid #333"
                }}
              >
                Save
              </div>

              <div
                onClick={() => {
                  setShowFileMenu(false);
                  // trigger hidden file input to load HTML file
                  fileInputRef.current && fileInputRef.current.click();
                }}
                style={{
                  cursor: "pointer",
                  color: "white",
                  textAlign: "center",
                  fontSize: ".9vw",
                  borderBottom: "0.2vw solid #333"
                }}
              >
                Load
              </div>
            </div>
          )}
        </div>
        {/* hidden file input used by Load action */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".html"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) loadFromHTML(f);
            // clear selection so same file can be reloaded if needed
            e.target.value = null;
          }}
        />
      </div>

      {/* SIDEBAR */}
      <div style={{
        background: "#222",
        padding: "1vw",
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        gap: "1vw",
        alignItems: "center",
        borderRight: "0.4vw solid #444",
      }}>
        {/* COLOR MENU HEADER */}
        <div style={{ width: "100%", position: "relative" }}>
          <button
            onClick={() => setShowColorMenu(prev => !prev)}
            style={{
              width: "8vw",
              background: "#333",
              color: "white",
              border: "0.3vw solid #666",
              borderRadius: "1vw",
              padding: "0.5vw 1vw",
              cursor: "pointer",
              fontSize: "1.3vw",
            }}
          >
            {showColorMenu ? "▼ Color" : "► Color"}
          </button>
        </div>

        {/* COLOR MENU CONTENT */}
        {showColorMenu && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1vw",
            width: "100%",
            transition: "max-height 0.3s ease",
          }}>
            {/* PRIMARY COLOR */}
            <div style={{ width: "100%", textAlign: "center" }}>
              <div style={{ color: "white", fontSize: "1.2vw", marginBottom: "0.5vw" }}>Primary</div>
              <div
                onClick={() => setActiveTool("primary")}
                style={{
                  width: "7vw",
                  height: "7vw",
                  background: primaryColor,
                  border: activeTool === "primary" ? "0.4vw solid white" : "0.3vw solid #666",
                  borderRadius: "1vw",
                  cursor: "pointer",
                  margin: "0 auto",
                  boxShadow: activeTool === "primary" ? "0 0 1vw rgba(255,255,255,0.5)" : "none",
                }}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(normalizeHexInput(e.target.value))}
                maxLength={7}
                style={{
                  width: "7vw",
                  marginTop: "0.5vw",
                  background: "#111",
                  border: "0.2vw solid #666",
                  color: "white",
                  textAlign: "center",
                  borderRadius: "0.5vw",
                  fontSize: "1.2vw",
                  padding: "0.3vw",
                }}
              />
            </div>

            {/* SECONDARY COLOR */}
            <div style={{ width: "100%", textAlign: "center" }}>
              <div style={{ color: "white", fontSize: "1.2vw", marginBottom: "0.5vw" }}>Secondary</div>
              <div
                onClick={() => setActiveTool("secondary")}
                style={{
                  width: "7vw",
                  height: "7vw",
                  background: secondaryColor,
                  border: activeTool === "secondary" ? "0.4vw solid white" : "0.3vw solid #666",
                  borderRadius: "1vw",
                  cursor: "pointer",
                  margin: "0 auto",
                  boxShadow: activeTool === "secondary" ? "0 0 1vw rgba(255,255,255,0.5)" : "none",
                }}
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(normalizeHexInput(e.target.value))}
                maxLength={7}
                style={{
                  width: "7vw",
                  marginTop: "0.5vw",
                  background: "#111",
                  border: "0.2vw solid #666",
                  color: "white",
                  textAlign: "center",
                  borderRadius: "0.5vw",
                  fontSize: "1.2vw",
                  padding: "0.3vw",
                }}
              />
            </div>

            {/* COLOR PICKER */}
            <div style={{
              width: "7vw",
              height: "3vw",
              border: "0.3vw solid #888",
              borderRadius: "1vw",
              overflow: "hidden",
              marginTop: "1vw",
            }}>
              <input
                ref={colorPickerRef}
                type="color"
                value={color}
                onChange={(e) => {
                  if (activeTool === "primary") {
                    setPrimaryColor(e.target.value);
                  } else {
                    setSecondaryColor(e.target.value);
                  }
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* GRID */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, .5vw)`,
        gridTemplateRows: `repeat(${rows}, .5vw)`,
        userSelect: "none",
        touchAction: "none"
      }}>
        {pixelColors.map((c, i) => (
          <div
            key={i}
            style={{ background: c }}
            onPointerDown={(e) => {
              setIsDrawing(true);
              paintPixel(e, i);
            }}
            onPointerEnter={() => {
              if (isDrawing) paintPixel(null, i);
            }}
          />
        ))}
      </div>
    </div>
  );
}
