import { ImageResponse } from "next/og";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

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
    const priceChange = searchParams.get("priceChange") || "0.00";
    const priceChangeNum = parseFloat(priceChange);
    const isPositive = priceChangeNum >= 0;

    // Perps params
    const side = searchParams.get("side") || "LONG";
    const coin = searchParams.get("coin") || "";
    const sizeCoins = searchParams.get("sizeCoins") || "";
    const entryPrice = searchParams.get("entryPrice") || "0.00";
    const markPrice = searchParams.get("markPrice") || "0.00";
    const returnPct = searchParams.get("returnPercent") || "0.00";
    const leverage = searchParams.get("leverage") || "";
    const orderType = searchParams.get("orderType") || "";
    const platform = searchParams.get("platform") || "";

    const isShort = side.toUpperCase() === "SHORT";
    const returnNum = parseFloat(returnPct);
    const isReturnPos = returnNum >= 0;
    const sideBg = isShort ? "#fff1f2" : "#f0fdf4";
    const sideBorder = isShort ? "#fecdd3" : "#bbf7d0";
    const sideColor = isShort ? "#e11d48" : "#16a34a";
    const returnColor = isReturnPos ? "#16a34a" : "#e11d48";
    const returnBg = isReturnPos ? "#f0fdf4" : "#fff1f2";
    const returnBorder = isReturnPos ? "#bbf7d0" : "#fecdd3";

    // Prediction params
    const marketTitle = searchParams.get("marketTitle") || "";
    const pickedOutcome = searchParams.get("pickedOutcome") || ""; // "Yes" | "No" | team name
    const yesOutcome = searchParams.get("yesOutcome") || "Yes";
    const noOutcome = searchParams.get("noOutcome") || "No";
    const yesPrice = searchParams.get("yesPrice") || "0.00"; // e.g. "0.925" → 92.5%
    const noPrice = searchParams.get("noPrice") || "0.00";
    const costUsd = searchParams.get("costUsd") || "0.00";
    const potentialWin = searchParams.get("potentialWin") || "0.00";

    const yesPct = (parseFloat(yesPrice) * 100).toFixed(0);
    const noPct = (parseFloat(noPrice) * 100).toFixed(0);

    // Which side did the user pick?
    const pickedYes =
      pickedOutcome.toLowerCase() === yesOutcome.toLowerCase() ||
      pickedOutcome.toLowerCase() === "yes";
    const pickedColor = pickedYes ? "#16a34a" : "#e11d48";
    const pickedBg = pickedYes ? "#f0fdf4" : "#fff1f2";
    const pickedBorder = pickedYes ? "#bbf7d0" : "#fecdd3";

    const hasImage = Boolean(imageUrl);
    const isSwap = type === "swap";
    const isPerps = type === "perps";
    const isPrediction = type === "prediction";

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

        {/* ── SWAP CARD ────────────────────────────────────────────── */}
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
              position: "relative",
            }}
          >
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

        {/* ── PERPS CARD ───────────────────────────────────────────── */}
        {isPerps && (
          <div
            style={{
              display: "flex",
              flex: 1,
              margin: "0 60px 30px 60px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1.5px solid #e2e8f0",
              padding: "36px 52px",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: sideBg,
                  border: `1.5px solid ${sideBorder}`,
                  borderRadius: "8px",
                  padding: "8px 28px",
                }}
              >
                <span
                  style={{
                    fontSize: "30px",
                    fontWeight: "700",
                    color: sideColor,
                    display: "flex",
                  }}
                >
                  {side}
                </span>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span
                  style={{
                    fontSize: "34px",
                    fontWeight: "700",
                    color: "#0f172a",
                    display: "flex",
                  }}
                >
                  {coin}-PERP
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    color: "#64748b",
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  {sizeCoins} {coin}
                  {leverage ? `  ·  ${leverage}×` : ""}
                  {orderType ? `  ·  ${orderType}` : ""}
                </span>
              </div>
              <div style={{ display: "flex", marginLeft: "auto" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: returnBg,
                    border: `1.5px solid ${returnBorder}`,
                    borderRadius: "999px",
                    padding: "10px 32px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "32px",
                      fontWeight: "700",
                      color: returnColor,
                      display: "flex",
                    }}
                  >
                    {isReturnPos ? "+" : ""}
                    {returnPct}%
                  </span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                height: "1px",
                backgroundColor: "#e2e8f0",
                width: "100%",
              }}
            />
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    color: "#94a3b8",
                    fontWeight: "600",
                    letterSpacing: "0.08em",
                    display: "flex",
                  }}
                >
                  ENTRY PRICE
                </span>
                <span
                  style={{
                    fontSize: "38px",
                    fontWeight: "700",
                    color: "#0f172a",
                    display: "flex",
                  }}
                >
                  ${entryPrice}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  width: "1px",
                  height: "70px",
                  backgroundColor: "#e2e8f0",
                  margin: "0 48px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    color: "#94a3b8",
                    fontWeight: "600",
                    letterSpacing: "0.08em",
                    display: "flex",
                  }}
                >
                  {coin} PRICE
                </span>
                <span
                  style={{
                    fontSize: "38px",
                    fontWeight: "700",
                    color: "#0f172a",
                    display: "flex",
                  }}
                >
                  ${markPrice}
                </span>
              </div>
              {platform && (
                <div
                  style={{
                    display: "flex",
                    marginLeft: "auto",
                    alignItems: "flex-end",
                    paddingBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "20px",
                      color: "#94a3b8",
                      fontWeight: "500",
                      display: "flex",
                      textTransform: "capitalize",
                    }}
                  >
                    via {platform}
                  </span>
                </div>
              )}
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
              borderRadius: "16px",
              border: "1.5px solid #e2e8f0",
              padding: "36px 52px",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* Market title */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <span
                style={{
                  fontSize: "18px",
                  color: "#94a3b8",
                  fontWeight: "600",
                  letterSpacing: "0.08em",
                  display: "flex",
                }}
              >
                PREDICTION MARKET
              </span>
              <span
                style={{
                  fontSize: "30px",
                  fontWeight: "700",
                  color: "#0f172a",
                  display: "flex",
                  lineHeight: "1.3",
                }}
              >
                {marketTitle}
              </span>
            </div>

            {/* Picked outcome badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span
                style={{ fontSize: "20px", color: "#64748b", display: "flex" }}
              >
                Picked
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pickedBg,
                  border: `1.5px solid ${pickedBorder}`,
                  borderRadius: "8px",
                  padding: "6px 24px",
                }}
              >
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: pickedColor,
                    display: "flex",
                  }}
                >
                  {pickedOutcome}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                height: "1px",
                backgroundColor: "#e2e8f0",
                width: "100%",
              }}
            />

            {/* Bottom row: Cost | Potential Win | Yes% bar | No% bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0px" }}>
              {/* Cost */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    color: "#94a3b8",
                    fontWeight: "600",
                    letterSpacing: "0.08em",
                    display: "flex",
                  }}
                >
                  COST
                </span>
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#0f172a",
                    display: "flex",
                  }}
                >
                  ${costUsd}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  width: "1px",
                  height: "60px",
                  backgroundColor: "#e2e8f0",
                  margin: "0 36px",
                }}
              />

              {/* Potential win */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    color: "#94a3b8",
                    fontWeight: "600",
                    letterSpacing: "0.08em",
                    display: "flex",
                  }}
                >
                  TO WIN
                </span>
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#16a34a",
                    display: "flex",
                  }}
                >
                  ${Number(potentialWin).toFixed(2)}
                </span>
              </div>

              {/* Yes / No probability bars — pushed right */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginLeft: "auto",
                  minWidth: "320px",
                }}
              >
                {/* YES bar */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      color: "#64748b",
                      display: "flex",
                      width: "120px",
                    }}
                  >
                    {yesOutcome}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      height: "12px",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: `${yesPct}%`,
                        height: "100%",
                        backgroundColor: "#16a34a",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#16a34a",
                      display: "flex",
                      width: "52px",
                      justifyContent: "flex-end",
                    }}
                  >
                    {yesPct}%
                  </span>
                </div>

                {/* NO bar */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      color: "#64748b",
                      display: "flex",
                      width: "120px",
                    }}
                  >
                    {noOutcome}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flex: 1,
                      height: "12px",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: `${noPct}%`,
                        height: "100%",
                        backgroundColor: "#e11d48",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#e11d48",
                      display: "flex",
                      width: "52px",
                      justifyContent: "flex-end",
                    }}
                  >
                    {noPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── REGULAR IMAGE ─────────────────────────────────────────── */}
        {!isSwap && !isPerps && !isPrediction && hasImage && (
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
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              alt="Feed"
            />
          </div>
        )}

        {/* ── GIF PLACEHOLDER ───────────────────────────────────────── */}
        {!isSwap &&
          !isPerps &&
          !isPrediction &&
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
              src={`${process.env.NEXT_PUBLIC_APP_URL}/astro-agent.png`}
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
