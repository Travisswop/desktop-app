// import { ImageResponse } from "next/og";

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);

//     const ensName = searchParams.get("ensName") || "swop.user";
//     const title = searchParams.get("title") || "Swop Feed";
//     const imageUrl = searchParams.get("image") || "";
//     const date = searchParams.get("date") || "";
//     const showGifPlaceholder =
//       searchParams.get("showGifPlaceholder") === "true";

//     const hasImage = Boolean(imageUrl);
//     const hasMedia = hasImage || showGifPlaceholder;

//     return new ImageResponse(
//       <div
//         style={{
//           height: "100%",
//           width: "100%",
//           display: "flex",
//           flexDirection: "column",
//           backgroundColor: "#ffffff",
//         }}
//       >
//         {/* ENS Name */}
//         <div
//           style={{
//             fontSize: "40px",
//             fontWeight: "bold",
//             color: "#000000",
//             padding: "40px 60px 20px 60px",
//             display: "flex",
//           }}
//         >
//           {ensName}
//         </div>

//         {/* Title */}
//         <div
//           style={{
//             fontSize: "28px",
//             color: "#333333",
//             padding: "0 60px 30px 60px",
//             display: "flex",
//             lineHeight: "1.4",
//           }}
//         >
//           {title}
//         </div>

//         {/* Real image */}
//         {hasImage && (
//           <div
//             style={{
//               display: "flex",
//               flex: 1,
//               margin: "0 60px 30px 60px",
//               backgroundColor: "#f5f5f5",
//               alignItems: "center",
//               justifyContent: "center",
//               borderRadius: "12px",
//               overflow: "hidden",
//             }}
//           >
//             <img
//               src={imageUrl}
//               width="1080"
//               height="350"
//               style={{
//                 width: "100%",
//                 height: "100%",
//                 objectFit: "cover",
//               }}
//               alt="Feed"
//             />
//           </div>
//         )}

//         {/* GIF placeholder */}
//         {!hasImage && showGifPlaceholder && (
//           <div
//             style={{
//               display: "flex",
//               flex: 1,
//               margin: "0 60px 30px 60px",
//               backgroundColor: "#f0f0f0",
//               alignItems: "center",
//               justifyContent: "center",
//               borderRadius: "12px",
//               flexDirection: "column",
//               gap: "8px",
//             }}
//           >
//             <div style={{ fontSize: "64px", display: "flex" }}>🎞️</div>
//             <div
//               style={{
//                 fontSize: "28px",
//                 color: "#888888",
//                 fontWeight: "bold",
//                 display: "flex",
//               }}
//             >
//               GIF
//             </div>
//             <div
//               style={{
//                 fontSize: "18px",
//                 color: "#aaaaaa",
//                 display: "flex",
//               }}
//             >
//               View on Swop
//             </div>
//           </div>
//         )}

//         {/* Footer */}
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             padding: "0 60px 40px 60px",
//             gap: "15px",
//           }}
//         >
//           <div
//             style={{
//               width: "40px",
//               height: "40px",
//               borderRadius: "50%",
//               background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               fontSize: "24px",
//               fontWeight: "bold",
//               color: "white",
//             }}
//           >
//             <img
//               src={`${process.env.NEXT_PUBLIC_APP_URL}/astro-agent.png`}
//               width="200"
//               height="200"
//               style={{ width: "100%", height: "100%" }}
//               alt="swop"
//             />
//           </div>
//           <div
//             style={{
//               fontSize: "22px",
//               color: "#666666",
//               display: "flex",
//             }}
//           >
//             Swop • {date}
//           </div>
//         </div>
//       </div>,
//       { width: 1200, height: 630 },
//     );
//   } catch (e: any) {
//     console.error("OG Image generation error:", e);
//     return new ImageResponse(
//       <div
//         style={{
//           height: "100%",
//           width: "100%",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           backgroundColor: "#fee",
//           fontSize: "30px",
//           color: "#c00",
//         }}
//       >
//         Error: {e.message}
//       </div>,
//       { width: 1200, height: 630 },
//     );
//   }
// }
import { ImageResponse } from "next/og";

const DEFAULT_PUBLIC_APP_URL = "https://www.swopme.app";

function cleanText(value: string | null) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPositiveMetric(value: string) {
  return !cleanText(value).startsWith("-");
}

function statusLabel(value: string) {
  const normalized = cleanText(value).toLowerCase();
  if (!normalized) return "";
  if (normalized === "liquidate") return "Liquidated";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_PUBLIC_APP_URL).replace(
      /\/+$/,
      "",
    );

    const type = searchParams.get("type") || "default";
    const ensName = searchParams.get("ensName") || "swop.user";
    const title = searchParams.get("title") || "Swop Feed";
    const imageUrl = searchParams.get("image") || "";
    const date = searchParams.get("date") || "";
    const showGifPlaceholder =
      searchParams.get("showGifPlaceholder") === "true";

    // Swap params
    const inputSymbol = searchParams.get("inputSymbol") || "";
    const inputAmount = searchParams.get("inputAmount") || "";
    const inputImg = searchParams.get("inputImg") || "";
    const outputSymbol = searchParams.get("outputSymbol") || "";
    const outputAmount = searchParams.get("outputAmount") || "";
    const outputImg = searchParams.get("outputImg") || "";

    // Prediction params
    const author = cleanText(searchParams.get("author")) || ensName;
    const marketTitle = cleanText(searchParams.get("marketTitle")) || title;
    const outcome = cleanText(searchParams.get("outcome")) || "Pick";
    const predictionSide = cleanText(searchParams.get("side")) || "BUY";
    const predictionPrice = cleanText(searchParams.get("price"));
    const predictionStake = cleanText(searchParams.get("stake"));
    const predictionPnl = cleanText(searchParams.get("pnl"));
    const predictionStatus = statusLabel(searchParams.get("status") || "");

    // Perps params
    const coin = cleanText(searchParams.get("coin")) || "PERP";
    const perpsSide = cleanText(searchParams.get("perpsSide")) || "LONG";
    const leverage = cleanText(searchParams.get("leverage"));
    const perpsStatus = statusLabel(searchParams.get("status") || "");
    const size = cleanText(searchParams.get("size"));
    const entryPrice = cleanText(searchParams.get("entryPrice"));
    const markPrice = cleanText(searchParams.get("markPrice"));
    const returnPct = cleanText(searchParams.get("returnPct"));

    const hasImage = Boolean(imageUrl);
    const isSwap = type === "swap";
    const isPrediction = type === "prediction";
    const isPerps = type === "perps";

    // Add to params extraction
    const priceChange = searchParams.get("priceChange") || "0.00";
    const priceChangeNum = parseFloat(priceChange);
    const isPositive = priceChangeNum >= 0;
    const predictionIsPositive = isPositiveMetric(predictionPnl);
    const perpsIsPositive = isPositiveMetric(returnPct);

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
        }}
      >
        {/* ENS Name */}
        <div
          style={{
            fontSize: "40px",
            fontWeight: "bold",
            color: "#000000",
            padding: "40px 60px 20px 60px",
            display: "flex",
          }}
        >
          {ensName}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "28px",
            color: "#333333",
            padding: "0 60px 30px 60px",
            display: "flex",
            lineHeight: "1.4",
          }}
        >
          {title}
        </div>

        {/* ── SWAP CARD ─────────────────────────────────────────────── */}
        {isSwap && (
          <div
            style={{
              display: "flex",
              flex: 1,
              margin: "0 60px 30px 60px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1.5px solid #e2e8f0",
              padding: "0 60px",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative", // for badge positioning
            }}
          >
            {/* Input Token — You sent */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {inputImg && (
                  <img
                    src={inputImg}
                    width="52"
                    height="52"
                    style={{
                      borderRadius: "50%",
                      width: "52px",
                      height: "52px",
                      objectFit: "cover",
                    }}
                    alt={inputSymbol}
                  />
                )}
                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: "600",
                    color: "#1a202c",
                    display: "flex",
                  }}
                >
                  {inputSymbol}
                </div>
              </div>
              <div
                style={{ fontSize: "22px", color: "#718096", display: "flex" }}
              >
                You sent
              </div>
              <div
                style={{
                  fontSize: "44px",
                  fontWeight: "bold",
                  color: "#e53e3e",
                  display: "flex",
                }}
              >
                {inputAmount} {inputSymbol}
              </div>
            </div>

            {/* Arrow */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "48px",
                color: "#a0aec0",
              }}
            >
              →
            </div>

            {/* Output Token — You received */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {outputImg && (
                  <img
                    src={outputImg}
                    width="52"
                    height="52"
                    style={{
                      borderRadius: "50%",
                      width: "52px",
                      height: "52px",
                      objectFit: "cover",
                    }}
                    alt={outputSymbol}
                  />
                )}
                <div
                  style={{
                    fontSize: "26px",
                    fontWeight: "600",
                    color: "#1a202c",
                    display: "flex",
                  }}
                >
                  {outputSymbol}
                </div>
              </div>
              <div
                style={{ fontSize: "22px", color: "#718096", display: "flex" }}
              >
                You received
              </div>
              <div
                style={{
                  fontSize: "44px",
                  fontWeight: "bold",
                  color: "#38a169",
                  display: "flex",
                }}
              >
                {outputAmount} {outputSymbol}
              </div>

              {/* ── Percentage badge — bottom right ──────────────────────────── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isPositive ? "#f0fff4" : "#fff5f5",
                  border: `1.5px solid ${isPositive ? "#9ae6b4" : "#feb2b2"}`,
                  borderRadius: "999px",
                  padding: "6px 20px",
                  marginTop: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "26px",
                    fontWeight: "600",
                    color: isPositive ? "#38a169" : "#e53e3e",
                    display: "flex",
                  }}
                >
                  {isPositive ? "+" : ""}
                  {priceChange}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── PREDICTION CARD ──────────────────────────────────────── */}
        {isPrediction && (
          <div
            style={{
              display: "flex",
              flex: 1,
              margin: "0 60px 30px 60px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              border: "1.5px solid #e5e7eb",
              padding: "28px 34px",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: "#6b7280",
                  fontSize: "22px",
                  fontWeight: 800,
                  letterSpacing: "5px",
                  textTransform: "uppercase",
                }}
              >
                Prediction • Market
              </div>
              {predictionStatus && (
                <div
                  style={{
                    display: "flex",
                    padding: "9px 18px",
                    borderRadius: "999px",
                    backgroundColor:
                      predictionStatus.toLowerCase() === "won"
                        ? "#ecfdf3"
                        : predictionStatus.toLowerCase() === "lost"
                          ? "#fff1f2"
                          : "#f3f4f6",
                    color:
                      predictionStatus.toLowerCase() === "won"
                        ? "#047857"
                        : predictionStatus.toLowerCase() === "lost"
                          ? "#be123c"
                          : "#374151",
                    fontSize: "22px",
                    fontWeight: 800,
                  }}
                >
                  {predictionStatus}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  color: "#111827",
                  fontSize: "44px",
                  fontWeight: 900,
                  lineHeight: 1.05,
                }}
              >
                {marketTitle}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  color: "#374151",
                  fontSize: "26px",
                  fontWeight: 800,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "50px",
                    height: "50px",
                    borderRadius: "999px",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#e8f0ff",
                    color: "#2563eb",
                    fontSize: "20px",
                    fontWeight: 900,
                  }}
                >
                  AS
                </div>
                <span>{author}</span>
                <span style={{ color: "#6b7280" }}>
                  {predictionSide === "SELL" ? "sold" : "picked"}
                </span>
                <span style={{ color: "#2563eb" }}>{outcome}</span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                backgroundColor: "#111827",
                borderRadius: "18px",
                padding: "26px 30px",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#9ca3af",
                    fontSize: "18px",
                    fontWeight: 800,
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Entry
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#ffffff",
                    fontSize: "42px",
                    fontWeight: 900,
                  }}
                >
                  {predictionPrice || "Live"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#9ca3af",
                    fontSize: "18px",
                    fontWeight: 800,
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Stake
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#ffffff",
                    fontSize: "42px",
                    fontWeight: 900,
                  }}
                >
                  {predictionStake || "Swop"}
                </div>
              </div>
              {predictionPnl && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    alignItems: "flex-end",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      color: "#9ca3af",
                      fontSize: "18px",
                      fontWeight: 800,
                      letterSpacing: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    Result
                  </div>
                  <div
                    style={{
                      display: "flex",
                      color: predictionIsPositive ? "#34d399" : "#fb7185",
                      fontSize: "42px",
                      fontWeight: 900,
                    }}
                  >
                    {predictionPnl}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PERPS CARD ───────────────────────────────────────────── */}
        {isPerps && (
          <div
            style={{
              display: "flex",
              flex: 1,
              margin: "0 60px 30px 60px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              border: "1.5px solid #e5e7eb",
              padding: "30px 34px",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      padding: "10px 18px",
                      borderRadius: "12px",
                      backgroundColor: "#f3f4f6",
                      color: "#111827",
                      fontSize: "24px",
                      fontWeight: 900,
                      letterSpacing: "5px",
                      textTransform: "uppercase",
                    }}
                  >
                    {perpsStatus || "Open"} {leverage ? `${leverage}x` : ""}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      color: perpsSide === "SHORT" ? "#dc2626" : "#059669",
                      fontSize: "26px",
                      fontWeight: 900,
                    }}
                  >
                    {perpsSide}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#111827",
                    fontSize: "64px",
                    fontWeight: 950,
                    lineHeight: 1,
                  }}
                >
                  {coin}
                </div>
                {size && (
                  <div
                    style={{
                      display: "flex",
                      color: "#4b5563",
                      fontSize: "28px",
                      fontWeight: 800,
                    }}
                  >
                    {size} {coin}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#111827",
                    fontSize: "58px",
                    fontWeight: 950,
                    lineHeight: 1,
                  }}
                >
                  {markPrice || entryPrice || "--"}
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#9ca3af",
                    fontSize: "20px",
                    fontWeight: 900,
                    letterSpacing: "5px",
                    textTransform: "uppercase",
                  }}
                >
                  {coin} price
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                height: "118px",
                width: "100%",
                borderRadius: "18px",
                backgroundColor: "#f9fafb",
                border: "1px solid #eef2f7",
                alignItems: "center",
                justifyContent: "space-around",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#9ca3af",
                    fontSize: "18px",
                    fontWeight: 900,
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Entry price
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#111827",
                    fontSize: "34px",
                    fontWeight: 900,
                  }}
                >
                  {entryPrice || "--"}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  width: "1px",
                  height: "70px",
                  backgroundColor: "#e5e7eb",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#9ca3af",
                    fontSize: "18px",
                    fontWeight: 900,
                    letterSpacing: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Return
                </div>
                <div
                  style={{
                    display: "flex",
                    color: perpsIsPositive ? "#059669" : "#dc2626",
                    fontSize: "34px",
                    fontWeight: 900,
                  }}
                >
                  {returnPct || "--"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REGULAR IMAGE ─────────────────────────────────────────── */}
        {!isSwap && !isPrediction && !isPerps && hasImage && (
          <div
            style={{
              display: "flex",
              flex: 1,
              margin: "0 60px 30px 60px",
              backgroundColor: "#f5f5f5",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            <img
              src={imageUrl}
              width="1080"
              height="350"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              alt="Feed"
            />
          </div>
        )}

        {/* ── GIF PLACEHOLDER ───────────────────────────────────────── */}
        {!isSwap &&
          !isPrediction &&
          !isPerps &&
          !hasImage &&
          showGifPlaceholder && (
          <div
            style={{
              display: "flex",
              flex: 1,
              margin: "0 60px 30px 60px",
              backgroundColor: "#f0f0f0",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "64px", display: "flex" }}>🎞️</div>
            <div
              style={{
                fontSize: "28px",
                color: "#888888",
                fontWeight: "bold",
                display: "flex",
              }}
            >
              GIF
            </div>
            <div
              style={{ fontSize: "18px", color: "#aaaaaa", display: "flex" }}
            >
              View on Swop
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0 60px 40px 60px",
            gap: "15px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            <img
              src={`${appUrl}/astro-agent.png`}
              width="200"
              height="200"
              style={{ width: "100%", height: "100%" }}
              alt="swop"
            />
          </div>
          <div style={{ fontSize: "22px", color: "#666666", display: "flex" }}>
            Swop • {date}
          </div>
        </div>
      </div>,
      { width: 1200, height: 630 },
    );
  } catch (e: any) {
    console.error("OG Image generation error:", e);
    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fee",
          fontSize: "30px",
          color: "#c00",
        }}
      >
        Error: {e.message}
      </div>,
      { width: 1200, height: 630 },
    );
  }
}
