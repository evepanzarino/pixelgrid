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
  
  const color = activeTool === "primary" ? primaryColor : secondaryColor;

  // Initialize with empty array, will be populated by useEffect
  const [pixelColors, setPixelColors] = useState([]);

  // 250 columns of 0.4vw = 100vw width
  const cols = 200;
  // For rows: calculate to fill viewport height
  // 0.4vw in pixels = (viewport width / 100) * 0.4
  const calculatedRows = Math.floor(size.h / (size.w * 0.005));
  const rows = calculatedRows > 0 ? calculatedRows : 100; // Fallback to 100 rows if calculation fails
  const totalPixels = cols * rows;

  const fileInputRef = useRef(null);

  // Initialize/resize pixelColors array when totalPixels changes
  useEffect(() => {
    setPixelColors((prev) => {
      if (prev.length === totalPixels) return prev;
      const newArray = Array(totalPixels).fill("#ffffff");
      // Copy over existing colors if possible
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
<div style="display:grid;grid-template-columns:repeat(200,0.5vw);grid-auto-rows:0.5vw;">
${pixelColors.map(c => `<div style="width:0.5vw;height:0.5vw;background:${c}"></div>`).join("")}}
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
        gridTemplateColumns: "5.25vw 3vw 1.5vw 4.5vw 3vw 2.25vw 3.75vw auto",
        zIndex: 20
      }}>
        <div className="logo" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: "repeat(7, .75vw)",
          gridTemplateRows: "repeat(7, .75vw)",
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
          gridTemplateColumns: "repeat(4, .75vw)",
          gridTemplateRows: "repeat(7, .75vw)",
          padding: 0,
          width: "3vw"
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
          gridTemplateColumns: "repeat(2, .75vw)",
          gridTemplateRows: "repeat(7, .75vw)",
          width: "1.5vw"
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
          gridTemplateColumns: "repeat(6, .75vw)",
          gridTemplateRows: "repeat(7, .75vw)",
          width: "4.5vw"
        }}>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x" style={{backgroundColor: "#000000"}}></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
<div className="title-x"></div>
        </div>

        <div className="title-letter-4" style={{
          display: "grid",
          position: "relative",
          gridTemplateColumns: "repeat(4, .75vw)",
          gridTemplateRows: "repeat(7, .75vw)",
          width: "3vw"
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
          gridTemplateColumns: "repeat(3, .75vw)",
          gridTemplateRows: "repeat(7, .75vw)",
          width: "2.25vw"
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
          gridTemplateColumns: "repeat(5, .75vw)",
          gridTemplateRows: "repeat(7, .75vw)",
          width: "3.75vw"
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
        width: "5.2vw",
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
                  width: "4vw",
                  height: "4vw",
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
                  width: "4vw",
                  height: "4vw",
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
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(200, 0.5vw)`,
        gridTemplateRows: `repeat(${rows}, 0.5vw)`,
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
                border: `0.1vw solid ${borderColor}`
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
