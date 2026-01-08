import { useEffect, useState, useRef } from "react";
import "./pixelgrid.css";

export default function PixelGrid() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [isDrawing, setIsDrawing] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [activeTool, setActiveTool] = useState("primary"); // "primary" or "secondary"
  const [showColorMenu, setShowColorMenu] = useState(true);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showColorEditor, setShowColorEditor] = useState(false);
  const [editingColor, setEditingColor] = useState(null); // "primary" or "secondary"
  const [hoveredPixel, setHoveredPixel] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  
  const color = activeTool === "primary" ? primaryColor : secondaryColor;
  const gridRef = useRef(null);

  // Zoom factor for drawing area based on screen size
  const getZoomFactor = () => {
    if (size.w <= 768) return  2.75; // Mobile
    if (size.w <= 1024) return 1.75; // Tablet
    if (size.w <= 1650) return 1.25;
    return 1; // Desktop
  };

  // Logo and title pixel size based on screen size
  const getLogoPixelSize = () => {
    if (size.w > 1650) return 1.075; // Desktop: 7vw / 7 = 1vw per cell
    if (size.w <= 1024) return 1.43; // Mobile/Tablet: 10vw / 7 = 1.43vw
    return 1; // Mid-range
  };

  const getTitlePixelSize = () => {
    if (size.w > 1650) return 0.75; // Desktop: scaled down
    return 0.75; // Same size on all screen sizes
  };

  const zoomFactor = getZoomFactor();
  const logoPixelSize = getLogoPixelSize();
  const titlePixelSize = getTitlePixelSize();
  const cols = 200; // Fixed 200 columns
  const basePixelSize = 0.75; // Base pixel size in vw
  const displayPixelSize = basePixelSize * zoomFactor;
  
  // Calculate rows needed to fill the screen height
  const pixelSizeInPx = (displayPixelSize / 100) * size.w; // Convert vw to px
  const rows = Math.ceil(size.h / pixelSizeInPx);
  const totalPixels = cols * rows;

  // Initialize pixelColors with current total, preserving existing data
  const [pixelColors, setPixelColors] = useState(() => Array(totalPixels).fill("#ffffff"));

  const fileInputRef = useRef(null);

  // Update pixel array when totalPixels changes, preserving existing data
  useEffect(() => {
    setPixelColors((prev) => {
      if (prev.length === totalPixels) return prev;
      const newArray = Array(totalPixels).fill("#ffffff");
      // Copy over existing colors
      const copyLength = Math.min(prev.length, totalPixels);
      for (let i = 0; i < copyLength; i++) {
        newArray[i] = prev[i];
      }
      return newArray;
    });
  }, [totalPixels]);

  useEffect(() => {
    function handleResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    const stopDrawing = () => {
      setIsDrawing(false);
      setHoveredPixel(null);
    };

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

  function isLightColor(hex) {
    if (!hex || hex.length < 7) return false;
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  function saveToHTML() {
    const data = JSON.stringify(pixelColors);
    const html = `
<body style="margin:0; overflow-x:hidden;">
<div style="display:grid;grid-template-columns:repeat(200,0.75vw);grid-auto-rows:0.75vw;">
${pixelColors.map(c => `<div style="width:0.75vw;height:0.75vw;background:${c}"></div>`).join("")}}
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
    <div className="pixelgrid-container" style={{ width: "100vw", overflow: "hidden" }}>

      {/* TOP BAR */}
      <div style={{
        top: 0,
        left: 0,
        width: "100vw",
        height: "auto",
        background: "rgb(255, 255, 255)",
        borderBottomWidth: "0.3vw",
        borderBottomStyle: "solid",
        borderBottomColor: "rgb(0, 0, 0)",
        display: "grid",
        alignItems: "center",
        gridTemplateColumns: `${logoPixelSize * 7}vw ${titlePixelSize * 4}vw ${titlePixelSize * 2}vw ${titlePixelSize * 4}vw ${titlePixelSize * 4}vw ${titlePixelSize * 3}vw ${titlePixelSize * 5}vw ${titlePixelSize * 4}vw ${titlePixelSize * 2}vw ${titlePixelSize * 4}vw .75vw auto auto auto auto`,
        zIndex: 20
      }}>
        <div className="logo" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(7, ${logoPixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${logoPixelSize}vw)`,
        }}>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels" style={{background: "black"}}></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
<div className="logo-pixels"></div>
          
        </div>

        <div className="title-letter-1" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          padding: 0,
          width: `${titlePixelSize * 4}vw`
        }}>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
<div className="title-p"></div>
          </div>

        <div className="title-letter-2" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(2, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 2}vw`
        }}>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
        </div>

                <div className="title-letter-3" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 4}vw`
        }}>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor:"#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
        </div>

        <div className="title-letter-4" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 4}vw`
        }}>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e" style={{backgroundColor: "#000000"}}></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
<div className="title-e"></div>
        </div>

<div className="title-letter-5" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(3, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 3}vw`
        }}>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l" style={{backgroundColor: "#000000"}}></div>
<div className="title-l"></div>
<div className="title-l"></div>
<div className="title-l"></div>
        </div>

 <div className="title-letter-6" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(5, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 5}vw`
        }}>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g" style={{backgroundColor: "#000000"}}></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
<div className="title-g"></div>
        </div>
 <div className="title-letter-7" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 4}vw`
        }}>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r"></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r" style={{backgroundColor:"#000000"}}></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r" style={{backgroundColor: "#000000"}}></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
<div className="title-r"></div>
        </div>
<div className="title-letter-8" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(2, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 2}vw`
        }}>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "#000000"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i" style={{backgroundColor: "rgb(0, 0, 0)"}}></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
<div className="title-i"></div>
        </div>

<div className="title-letter-9" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: `repeat(4, ${titlePixelSize}vw)`,
          gridTemplateRows: `repeat(7, ${titlePixelSize}vw)`,
          width: `${titlePixelSize * 4}vw`
        }}>
          <div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d" style={{backgroundColor: "#000000"}}></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
<div className="title-d"></div>
        </div>
        <div className="title-pixel-padding"></div>

        {/* FILE BUTTON */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowFileMenu(v => !v)}
            style={{
              background: "#222",
              color: "white",
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
              display: "grid",
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

<div className="grid-sidebar-wrapper" style={{display: "flex"}}>

      <div style={{
        background: "#fefefe",
        position: "relative",
        display: "inline-flex",
        width: size.w <= 1024 ? "10vw" : "7vw",
        flexDirection: "column",
        gap: "1vw",
        alignItems: "center",
        borderRight: "0.2vw solid #000000",
      }}>
        {/* COLOR MENU HEADER */}
        <div style={{ width: "100%", position: "relative" }}>
          <button
            onClick={() => setShowColorMenu(prev => !prev)}
            style={{
              background: "#333",
              color: "white",
              width: "100%",
              cursor: "pointer",
              fontSize: "1vw",
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
              <div style={{ color: "black", fontSize: "1vw", marginBottom: "0.5vw" }}>Primary</div>
              <div
                onClick={() => {
                  if (activeTool === "primary") {
                    setEditingColor("primary");
                    setShowColorEditor(true);
                  } else {
                    setActiveTool("primary");
                  }
                }}
                style={{
                  width: size.w <= 1024 ? "8vw" : "6vw",
                  height: size.w <= 1024 ? "8vw" : "6vw",
                  background: primaryColor,
                  border: activeTool === "primary" 
                    ? (isLightColor(primaryColor) ? "0.4vw solid #000000" : "0.4vw solid #ffffff")
                    : (isLightColor(primaryColor) ? "0.3vw solid #000000" : "0.3vw solid #ffffff"),
                  cursor: "pointer",
                  margin: "0 auto",
                  boxShadow: activeTool === "primary" 
                    ? "0px 0px .2vw .2vw #000000"
                    : "none",
                }}
              />
            </div>

            {/* SECONDARY COLOR */}
            <div style={{ width: "100%", textAlign: "center" }}>
              <div style={{ color: "black", fontSize: "1vw", marginBottom: "0.5vw" }}>Secondary</div>
              <div
                onClick={() => {
                  if (activeTool === "secondary") {
                    setEditingColor("secondary");
                    setShowColorEditor(true);
                  } else {
                    setActiveTool("secondary");
                  }
                }}
                style={{
                  width: size.w <= 1024 ? "8vw" : "6vw",
                  height: size.w <= 1024 ? "8vw" : "6vw",
                  background: secondaryColor,
                  border: activeTool === "secondary" 
                    ? (isLightColor(secondaryColor) ? "0.4vw solid #000000" : "0.4vw solid #ffffff")
                    : (isLightColor(secondaryColor) ? "0.3vw solid #000000" : "0.3vw solid #ffffff"),
                  cursor: "pointer",
                  margin: "0 auto",
                  boxShadow: activeTool === "secondary" 
                    ? (isLightColor(secondaryColor) ? "0 0 1vw rgba(0,0,0,0.5)" : "0 0 1vw rgba(255,255,255,0.5)") 
                    : "none",
                }}
              />

            </div>
          </div>
        )}
      </div>

      {/* GRID */}
      <div 
        ref={gridRef}
        onScroll={(e) => {
          if (size.w <= 1024) {
            setScrollPosition(e.target.scrollLeft);
          }
        }}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(200, ${displayPixelSize}vw)`,
          gridTemplateRows: `repeat(${rows}, ${displayPixelSize}vw)`,
          userSelect: "none",
          touchAction: "none",
          flex: 1,
          overflow: "auto"
        }}>
        {(pixelColors || []).map((c, i) => {
          const isLight = isLightColor(c);
          const isHovered = !isDrawing && hoveredPixel === i;
          const borderColor = isHovered ? (isLight ? '#000000' : '#fefefe') : 'transparent';
          
          return (
            <div
              key={`${i}-${c}`}
              style={{ 
                background: c, 
                boxSizing: 'border-box',
                border: `${0.1 * zoomFactor}vw solid ${borderColor}`
              }}
              onPointerDown={(e) => {
                setIsDrawing(true);
                paintPixel(e, i);
              }}
              onPointerEnter={() => {
                if (isDrawing) {
                  paintPixel(null, i);
                } else {
                  setHoveredPixel(i);
                }
              }}
              onPointerLeave={() => {
                if (!isDrawing) {
                  setHoveredPixel(null);
                }
              }}
            />
          );
        })}
      </div>
      </div>
      
      {/* MOBILE/TABLET BOTTOM SCROLLBAR */}
      {size.w <= 1024 && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "10vw",
          display: "grid",
          gridTemplateColumns: "10vw 1fr 10vw",
          background: "#fefefe",
          borderTop: "0.2vw solid #000000",
          zIndex: 100
        }}>
          {/* Left scroll button */}
          <div 
            onPointerDown={() => {
              if (gridRef.current) {
                gridRef.current.scrollLeft = Math.max(0, scrollPosition - 100);
              }
            }}
            style={{
              width: "10vw",
              height: "10vw",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fefefe",
              borderRight: "0.2vw solid #000000",
              cursor: "pointer",
              fontSize: "5vw",
              userSelect: "none"
            }}
          >
            ◀
          </div>

          {/* Slider track */}
          <div 
            style={{
              width: "100%",
              height: "10vw",
              background: "#fefefe",
              position: "relative",
              padding: "1vw",
              display: "flex",
              alignItems: "center"
            }}
          >
            <div
              onPointerDown={(e) => {
                setIsDraggingSlider(true);
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = x / rect.width;
                const maxScroll = gridRef.current ? gridRef.current.scrollWidth - gridRef.current.clientWidth : 0;
                if (gridRef.current) {
                  gridRef.current.scrollLeft = percent * maxScroll;
                }
              }}
              onPointerMove={(e) => {
                if (isDraggingSlider && gridRef.current) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = Math.max(0, Math.min(1, x / rect.width));
                  const maxScroll = gridRef.current.scrollWidth - gridRef.current.clientWidth;
                  gridRef.current.scrollLeft = percent * maxScroll;
                }
              }}
              onPointerUp={() => setIsDraggingSlider(false)}
              onPointerLeave={() => setIsDraggingSlider(false)}
              style={{
                width: "100%",
                height: "8vw",
                background: "#ffffff",
                border: "0.2vw solid #000000",
                position: "relative",
                cursor: "pointer",
                touchAction: "none"
              }}
            >
              {/* Slider thumb */}
              <div style={{
                position: "absolute",
                left: `calc(${gridRef.current ? Math.min(75, Math.max(0, (scrollPosition / (gridRef.current.scrollWidth - gridRef.current.clientWidth)) * 100)) : 0}% - 0px)`,
                top: "0",
                width: "20vw",
                height: "8vw",
                background: "#000000",
                pointerEvents: "none"
              }} />
            </div>
          </div>

          {/* Right scroll button */}
          <div 
            onPointerDown={() => {
              if (gridRef.current) {
                gridRef.current.scrollLeft = scrollPosition + 100;
              }
            }}
            style={{
              width: "10vw",
              height: "10vw",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fefefe",
              borderLeft: "0.2vw solid #000000",
              cursor: "pointer",
              fontSize: "5vw",
              userSelect: "none"
            }}
          >
            ▶
          </div>
        </div>
      )}

      {/* COLOR EDITOR OVERLAY */}
      {showColorEditor && (
        <div
          onClick={() => setShowColorEditor(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: "2vw",
              minWidth: "5vw",
              display: "flex",
              flexDirection: "column",
              gap: "1vw",
            }}
          >
            <div style={{ color: "white", fontSize: "1.5vw", textAlign: "center" }}>
              Edit {editingColor === "primary" ? "Primary" : "Secondary"} Color
            </div>
            
            <div style={{ display: "flex", justifyContent: "center" }}>
              <input
                type="color"
                value={editingColor === "primary" ? primaryColor : secondaryColor}
                onChange={(e) => {
                  if (editingColor === "primary") {
                    setPrimaryColor(e.target.value);
                  } else {
                    setSecondaryColor(e.target.value);
                  }
                }}
                style={{
                  width: "2.5vw",
                  height: "2.5vw",
                  border: "0.3vw solid #000000",
                  cursor: "pointer",
                }}
              />
            </div>

            <input
              type="text"
              value={editingColor === "primary" ? primaryColor : secondaryColor}
              onChange={(e) => {
                const val = normalizeHexInput(e.target.value);
                if (editingColor === "primary") {
                  setPrimaryColor(val);
                } else {
                  setSecondaryColor(val);
                }
              }}
              maxLength={7}
              style={{
                width: "100%",
                background: "#111",
                border: "0.2vw solid #000000",
                color: "white",
                textAlign: "center",
                borderRadius: "0.5vw",
                fontSize: "1.5vw",
                padding: "1vw",
              }}
            />

            <button
              onClick={() => setShowColorEditor(false)}
              style={{
                color: "white",
                fontSize: "1.3vw",
                padding: "1vw",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
