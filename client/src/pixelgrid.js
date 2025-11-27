import { useEffect, useState, useRef } from "react";

export default function PixelGrid() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#3498db");
  const [swatches, setSwatches] = useState([
    "#3498db",
    "#e74c3c",
    "#2ecc71",
    "#ffffff",
  ]);
  const [showColorMenu, setShowColorMenu] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFileMenu, setShowFileMenu] = useState(false);

  const cellVW = size.w / 100;
  const rows = Math.max(1, Math.floor(size.h / cellVW));
  const totalPixels = Math.max(1, Math.floor(250 * rows * 1.2));
  const [pixelColors, setPixelColors] = useState(() => Array(totalPixels).fill("#000000"));

  const colorPickerRef = useRef(null);

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

  function handleSwatchClick(idx) {
    setSelectedIndex(idx);
    setColor(swatches[idx] || "#000000");
  }

  function saveToHTML() {
    const data = JSON.stringify(pixelColors);
    const html = `
<body style="margin:0; overflow-x:hidden;">
<div style="display:grid;grid-template-columns:repeat(250,1vw);grid-auto-rows:1vw;">
${pixelColors.map(c => `<div style="width:1vw;height:1vw;background:${c}"></div>`).join("")}
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
            width: "3vw",
            height: "3vw",
            marginLeft: "2vw",
            marginRight: "2vw",
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
            </div>
          )}
        </div>
      </div>

      {/* SIDEBAR */}
      <div style={{
        background: "#222",
        padding: "1vw",
        position: "relative",
        marginTop: "4vw",
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
            {swatches.map((sw, i) => (
              <div
                key={i}
                onClick={() => handleSwatchClick(i)}
                style={{
                  background: sw,
                  border: i === selectedIndex ? "0.4vw solid white" : "0.3vw solid #666",
                }}
                className="colored-label"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwatches(prev => prev.filter((_, idx) => idx !== i));
                    if (selectedIndex === i) setSelectedIndex(null);
                  }}
                  className="swatch-remove"
                  aria-label={`Remove swatch ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}

            {/* MAIN COLOR PICKER */}
            <div style={{
              width: "5vw",
              height: "5vw",
              border: "0.3vw solid #888",
              borderRadius: "1vw",
              marginTop: "6px",
              cursor: "pointer",
              overflow: "hidden",
            }}>
              <input
                ref={colorPickerRef}
                type="color"
                value={color}
                onChange={(e) => {
                  const c = e.target.value;
                  setColor(c);
                  if (selectedIndex != null) {
                    setSwatches(prev => {
                      const copy = [...prev];
                      copy[selectedIndex] = c;
                      return copy;
                    });
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
<div className="selected-label">
  Selected
  </div>
            {/* HEX INPUT */}
            <input
              type="text"
              value={color}
              onClick={() => colorPickerRef.current.click()} // open main color picker
              onChange={(e) => {
                const normalized = normalizeHexInput(e.target.value);
                setColor(normalized);
                if (selectedIndex != null) {
                  setSwatches(prev => {
                    const copy = [...prev];
                    copy[selectedIndex] = normalized;
                    return copy;
                  });
                }
              }}
              maxLength={7}
              style={{
                width: "7.5vw",
                marginTop: "1vw",
                background: "#111",
                border: "0.3vw solid #666",
                color: "white",
                textAlign: "center",
                borderRadius: "1vw",
                fontSize: "1.5vw",
              }}
            />

            <button
              type="button"
              onClick={() => {
                if (swatches.length < 4) {
                  setSwatches(prev => [...prev, "#ffffff"]);
                  setSelectedIndex(swatches.length);
                  setColor("#ffffff");
                }
              }}
              style={{
                marginTop: "1vw",
                padding: "0.5vw 1vw",
                background: "#333",
                color: "#fff",
                border: "0.3vw solid #666",
                borderRadius: "1vw",
                cursor: swatches.length >= 4 ? "not-allowed" : "pointer",
                opacity: swatches.length >= 4 ? 0.5 : 1,
                fontSize: "1.3vw",
                width: "7vw",
                textAlign: "center",
              }}
            >
              + Add
            </button>
          </div>
        )}
      </div>

      {/* GRID */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: `repeat(250, 1vw)`,
        gridTemplateRows: `repeat(${rows}, 1vw)`,
        userSelect: "none",
        touchAction: "none",
        marginTop: "4.2vw",
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
