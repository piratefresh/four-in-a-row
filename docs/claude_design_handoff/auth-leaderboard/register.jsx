// register.jsx — 3 register variations (desktop + mobile each)
// V1 Deal Yourself In — multi-step subscribe feel with chip progress
// V2 The Buy-In — atmospheric, welcome stake visualized
// V3 Pick a Seat — literal seat selection at mini-felt

// ═══════════════════════════════════════════════════════════════
// V1 · DEAL YOURSELF IN — multi-step
// ═══════════════════════════════════════════════════════════════

function ChipStack({ active = 1, total = 3 }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i + 1 === active;
        const isDone = i + 1 < active;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background:
                  isDone || isActive
                    ? "radial-gradient(circle at 30% 30%, #f4e4c1 0%, #d4af37 50%, #8a6f1e 100%)"
                    : "rgba(0,0,0,0.35)",
                border: `1.5px dashed ${isDone || isActive ? "#8a6f1e" : WP.rule}`,
                color: isDone || isActive ? "#1a1208" : WP.parchmentDim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: WP.mono,
                fontSize: 11,
                fontWeight: 700,
                boxShadow: isActive
                  ? `0 0 0 3px rgba(212,175,55,0.18)`
                  : "none",
              }}
            >
              {isDone ? "✓" : i + 1}
            </div>
            {i < total - 1 && (
              <div
                style={{
                  width: 30,
                  height: 1,
                  background: isDone ? WP.gold : WP.rule,
                  opacity: isDone ? 0.6 : 1,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const SEAT_COLORS = [
  { c: "#e6b450", name: "Honey" },
  { c: "#d97757", name: "Clay" },
  { c: "#9ec27a", name: "Sage" },
  { c: "#7ec4cf", name: "Teal" },
  { c: "#a78bfa", name: "Violet" },
  { c: "#f0a8c0", name: "Rose" },
  { c: "#c8a878", name: "Bone" },
  { c: "#b8a6f0", name: "Periwinkle" },
];

function RegisterDealinDesktop() {
  return (
    <ScreenBg>
      <Masthead tab="register" />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: 0,
        }}
      >
        {/* Left — registration form */}
        <div
          style={{
            padding: "50px 60px 40px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Kicker size={11} gap={3}>
            NEW HAND · STEP 2 OF 3
          </Kicker>
          <h1
            style={{
              margin: "12px 0 0",
              fontFamily: WP.serif,
              fontWeight: 600,
              fontSize: 54,
              lineHeight: 0.95,
              color: WP.goldBright,
              letterSpacing: -1.5,
            }}
          >
            Deal yourself <em style={{ color: WP.gold }}>in</em>.
          </h1>
          <div
            style={{
              marginTop: 10,
              fontFamily: WP.serif,
              fontStyle: "italic",
              fontSize: 14,
              color: WP.parchmentDim,
              maxWidth: 440,
            }}
          >
            Three quick steps and the dealer's ready. Buy-in's on the house
            tonight.
          </div>

          <div
            style={{
              marginTop: 26,
              padding: "20px 24px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.28)",
              border: `1px solid ${WP.rule}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <ChipStack active={2} />
              <Kicker size={9} gap={1.6}>
                ~ 30 SECONDS LEFT
              </Kicker>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Step header */}
              <div>
                <Kicker size={9}>HANDLE</Kicker>
                <div
                  style={{
                    fontFamily: WP.serif,
                    fontStyle: "italic",
                    fontSize: 22,
                    color: WP.goldBright,
                    marginTop: 2,
                  }}
                >
                  What should we call you?
                </div>
              </div>

              <Field
                label="DISPLAY NAME"
                placeholder="Magnus N."
                value="Magnus N."
              />

              <div>
                <Kicker size={9}>SUGGESTED HANDLES</Kicker>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {[
                    "M·Quill",
                    "NilsenJr",
                    "mago",
                    "TheWordSmith",
                    "Magnus99",
                  ].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "5px 11px",
                        borderRadius: 999,
                        cursor: "pointer",
                        background:
                          i === 2 ? "rgba(212,175,55,0.14)" : "rgba(0,0,0,0.3)",
                        border: `1px solid ${i === 2 ? WP.gold : WP.rule}`,
                        fontFamily: WP.mono,
                        fontSize: 11,
                        color: i === 2 ? WP.gold : WP.parchmentDim,
                      }}
                    >
                      @{h}
                    </div>
                  ))}
                </div>
              </div>

              {/* Seat color */}
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 8,
                  }}
                >
                  <Kicker size={9}>SEAT COLOR</Kicker>
                  <span
                    style={{
                      fontFamily: WP.serif,
                      fontStyle: "italic",
                      fontSize: 12,
                      color: WP.parchmentDim,
                    }}
                  >
                    How you'll show up at the table
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SEAT_COLORS.map((s, i) => (
                    <div
                      key={i}
                      title={s.name}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: s.c,
                        cursor: "pointer",
                        boxShadow:
                          i === 4
                            ? `0 0 0 2px ${WP.ink}, 0 0 0 4px ${WP.gold}`
                            : `0 0 0 2px ${WP.ink}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#1a1208",
                        fontFamily: WP.sans,
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {i === 4 ? "MN" : ""}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Rule label="STEP 3 · ACCOUNT" />

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field
                label="EMAIL"
                type="email"
                placeholder="you@example.com"
                icon="@"
              />
              <Field
                label="PASSWORD"
                type="password"
                placeholder="8+ characters"
                icon="●"
              />
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <GhostButton style={{ flex: "0 0 110px" }}>← Back</GhostButton>
              <div style={{ flex: 1 }}>
                <PrimaryButton kicker="↳ TO THE TABLE">
                  Deal me in
                </PrimaryButton>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: WP.sans,
                fontSize: 12,
                color: WP.parchmentDim,
              }}
            >
              Already have an account?{" "}
              <a style={{ color: WP.gold, fontWeight: 600 }}>Sign in</a>
            </span>
            <a
              style={{
                fontFamily: WP.sans,
                fontSize: 12,
                color: WP.parchmentDim,
                textDecoration: "underline",
              }}
            >
              Continue as guest
            </a>
          </div>
        </div>

        {/* Right — what you get */}
        <div
          style={{
            padding: "50px 60px 40px",
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(0,0,0,0.3) 80%)",
            borderLeft: `1px solid ${WP.rule}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Kicker size={11} gap={3}>
            YOUR WELCOME STAKE
          </Kicker>
          <div
            style={{
              marginTop: 8,
              fontFamily: WP.serif,
              fontWeight: 600,
              fontSize: 30,
              color: WP.goldBright,
              letterSpacing: -0.6,
            }}
          >
            Walk in with <em style={{ color: WP.gold }}>$500 on the house</em>
          </div>

          {/* Stack of chips visualization */}
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-end",
              gap: 24,
              padding: "24px 0",
            }}
          >
            {[
              { count: 5, c: "#d4af37", label: "$100" },
              { count: 8, c: "#d97757", label: "$50" },
              { count: 4, c: "#7ec4cf", label: "$25" },
              { count: 6, c: "#9ec27a", label: "$10" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column-reverse",
                    gap: 1,
                  }}
                >
                  {Array.from({ length: s.count }, (_, j) => (
                    <div
                      key={j}
                      style={{
                        width: 50,
                        height: 8,
                        borderRadius: "50%",
                        background: `radial-gradient(circle at 50% 30%, ${s.c} 0%, ${s.c}cc 60%, ${s.c}88 100%)`,
                        boxShadow:
                          "0 1px 0 rgba(255,255,255,0.3) inset, 0 1px 1px rgba(0,0,0,0.4)",
                        border: "1px solid rgba(0,0,0,0.35)",
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: WP.mono,
                    fontSize: 10,
                    color: WP.gold,
                    letterSpacing: 1.4,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Perks */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
            }}
          >
            {[
              {
                kicker: "WALK-IN",
                big: "$500 in chips",
                sub: "Yours, no buy-in. Stake the rookie tables for free.",
              },
              {
                kicker: "DAILY",
                big: "River Run access",
                sub: "Solo gauntlet · 8 hands · today's par is 240 pts.",
              },
              {
                kicker: "WEEKLY",
                big: "Standings + stats",
                sub: "Track your longest words and biggest pots.",
              },
              {
                kicker: "PRIVATE",
                big: "Open a table",
                sub: "Invite-only seats with custom blinds, no fee.",
              },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 1fr",
                  gap: 14,
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.25)",
                  border: `1px solid ${WP.ruleFaint}`,
                }}
              >
                <div
                  style={{
                    fontFamily: WP.mono,
                    fontSize: 16,
                    color: WP.gold,
                    marginTop: 2,
                  }}
                >
                  {["◐", "◈", "★", "◉"][i]}
                </div>
                <div>
                  <Kicker size={9}>{p.kicker}</Kicker>
                  <div
                    style={{
                      fontFamily: WP.serif,
                      fontSize: 16,
                      color: WP.goldBright,
                      marginTop: 2,
                      fontStyle: "italic",
                    }}
                  >
                    {p.big}
                  </div>
                  <div
                    style={{
                      fontFamily: WP.sans,
                      fontSize: 12,
                      color: WP.parchmentDim,
                      marginTop: 2,
                    }}
                  >
                    {p.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Testimonial-as-pull-quote */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: `1px solid ${WP.rule}`,
            }}
          >
            <div
              style={{
                fontFamily: WP.serif,
                fontStyle: "italic",
                fontSize: 14,
                color: WP.parchment,
                lineHeight: 1.5,
              }}
            >
              "I signed up at 11pm Tuesday. By midnight I was cleaning out Ollo
              with a 5× Q on the river. Worth it."
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: WP.mono,
                fontSize: 9,
                letterSpacing: 1.6,
                color: WP.parchmentDim,
              }}
            >
              — ZACK · WEEK 3 PLAYER
            </div>
          </div>
        </div>
      </div>

      <AtmosphereMarquee />
    </ScreenBg>
  );
}

function RegisterDealinMobile() {
  return (
    <ScreenBg>
      <div style={{ height: 54 }} />
      <div
        style={{
          padding: "8px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: WP.serif,
            fontWeight: 700,
            fontSize: 16,
            color: WP.goldBright,
          }}
        >
          Word Poker
        </div>
        <ChipStack active={2} />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "14px 18px 16px" }}>
        <Kicker size={9} gap={2.4}>
          NEW HAND · STEP 2 OF 3
        </Kicker>
        <h1
          style={{
            margin: "6px 0 0",
            fontFamily: WP.serif,
            fontWeight: 600,
            fontSize: 32,
            lineHeight: 0.98,
            color: WP.goldBright,
            letterSpacing: -0.6,
          }}
        >
          Deal yourself <em style={{ color: WP.gold }}>in</em>.
        </h1>

        {/* Welcome stake strip */}
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 10,
            background:
              "linear-gradient(90deg, rgba(212,175,55,0.18) 0%, rgba(0,0,0,0.2) 100%)",
            border: `1px solid ${WP.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column-reverse", gap: 1 }}
          >
            {Array.from({ length: 5 }, (_, j) => (
              <div
                key={j}
                style={{
                  width: 30,
                  height: 5,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 50% 30%, #f4e4c1 0%, #d4af37 60%, #8a6f1e 100%)",
                  border: "1px solid rgba(0,0,0,0.35)",
                }}
              />
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <Kicker size={9}>YOUR WELCOME STAKE</Kicker>
            <div
              style={{
                fontFamily: WP.serif,
                fontSize: 18,
                color: WP.gold,
                fontWeight: 600,
              }}
            >
              $500 on the house
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Field
            label="DISPLAY NAME"
            placeholder="Magnus N."
            value="Magnus N."
          />

          <div>
            <Kicker size={9}>SEAT COLOR</Kicker>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {SEAT_COLORS.slice(0, 7).map((s, i) => (
                <div
                  key={i}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: s.c,
                    boxShadow:
                      i === 4
                        ? `0 0 0 2px ${WP.ink}, 0 0 0 4px ${WP.gold}`
                        : `0 0 0 2px ${WP.ink}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1a1208",
                    fontFamily: WP.sans,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {i === 4 ? "MN" : ""}
                </div>
              ))}
            </div>
          </div>

          <Field
            label="EMAIL"
            type="email"
            placeholder="you@example.com"
            icon="@"
          />
          <Field
            label="PASSWORD"
            type="password"
            placeholder="8+ characters"
            icon="●"
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <PrimaryButton kicker="↳ TO THE TABLE">Deal me in</PrimaryButton>
        </div>

        <Rule label="OR" />
        <div style={{ display: "flex", gap: 6 }}>
          <GhostButton icon={GoogleGlyph}>Google</GhostButton>
          <GhostButton icon={AppleGlyph}>Apple</GhostButton>
        </div>

        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            fontSize: 12,
            color: WP.parchmentDim,
            fontFamily: WP.sans,
          }}
        >
          Already in? <a style={{ color: WP.gold, fontWeight: 600 }}>Sign in</a>{" "}
          ·{" "}
          <a style={{ color: WP.parchment, textDecoration: "underline" }}>
            Guest
          </a>
        </div>
      </div>

      <AtmosphereMarquee small />
    </ScreenBg>
  );
}

// ═══════════════════════════════════════════════════════════════
// V2 · THE BUY-IN — atmospheric, welcome stake hero
// ═══════════════════════════════════════════════════════════════

function ChipStackBig({ height = 220 }) {
  // A stylized leaning stack of chips on the felt
  const rows = [
    { c: "#d4af37", count: 12 },
    { c: "#d97757", count: 10 },
    { c: "#7ec4cf", count: 8 },
    { c: "#9ec27a", count: 6 },
  ];
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
        justifyContent: "center",
      }}
    >
      {rows.map((r, i) => (
        <div
          key={i}
          style={{ display: "flex", flexDirection: "column-reverse", gap: 2 }}
        >
          {Array.from({ length: r.count }, (_, j) => (
            <div
              key={j}
              style={{
                width: 64,
                height: 12,
                borderRadius: "50%",
                background: `radial-gradient(circle at 50% 30%, ${r.c} 0%, ${r.c}cc 60%, ${r.c}66 100%)`,
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.3) inset, 0 1px 2px rgba(0,0,0,0.4)",
                border: "1px solid rgba(0,0,0,0.4)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function RegisterBuyinDesktop() {
  return (
    <ScreenBg>
      <Masthead tab="register" />

      {/* Felt bg vignette */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(30,80,60,0.45) 0%, rgba(8,40,28,0.15) 50%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          flex: 1,
          padding: "40px 60px",
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 60,
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* Left — hero */}
        <div>
          <Kicker size={11} gap={3}>
            THE BUY-IN · TUESDAY NIGHT
          </Kicker>
          <h1
            style={{
              margin: "14px 0 0",
              fontFamily: WP.serif,
              fontWeight: 600,
              fontSize: 84,
              lineHeight: 0.9,
              color: WP.goldBright,
              letterSpacing: -3,
            }}
          >
            Walk in <em style={{ color: WP.gold }}>rich</em>.
          </h1>
          <div
            style={{
              marginTop: 16,
              fontFamily: WP.serif,
              fontStyle: "italic",
              fontSize: 18,
              color: WP.parchmentDim,
              maxWidth: 480,
              lineHeight: 1.5,
            }}
          >
            $500 in chips, your seat held for thirty days, and the dealer
            remembers your name. The first hand is on us.
          </div>

          {/* Big chip stack hero */}
          <div style={{ marginTop: 38, position: "relative" }}>
            <ChipStackBig />
            <div
              style={{
                position: "absolute",
                top: -28,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "4px 12px",
                borderRadius: 999,
                background: WP.ink,
                border: `1px solid ${WP.gold}`,
                fontFamily: WP.mono,
                fontSize: 10,
                letterSpacing: 2,
                color: WP.gold,
              }}
            >
              $500 · ON THE HOUSE
            </div>
          </div>

          {/* Footer perks row */}
          <div
            style={{
              marginTop: 40,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
              paddingTop: 20,
              borderTop: `1px solid ${WP.rule}`,
            }}
          >
            {[
              { k: "CHIPS", v: "$500", s: "Walk-in stake" },
              { k: "RIVER RUN", v: "Daily", s: "Solo gauntlet" },
              { k: "PRIVATE", v: "Free", s: "Open a table" },
            ].map((s, i) => (
              <div key={i}>
                <Kicker size={9}>{s.k}</Kicker>
                <div
                  style={{
                    fontFamily: WP.serif,
                    fontSize: 22,
                    color: WP.goldBright,
                    fontWeight: 600,
                    fontStyle: "italic",
                    marginTop: 4,
                  }}
                >
                  {s.v}
                </div>
                <div
                  style={{
                    fontFamily: WP.sans,
                    fontSize: 12,
                    color: WP.parchmentDim,
                    marginTop: 2,
                  }}
                >
                  {s.s}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form on parchment card */}
        <div
          style={{
            padding: "32px 32px 28px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.4)",
            border: `1px solid ${WP.rule}`,
            boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Mark size={36} />
            <div>
              <Kicker size={9}>NEW PLAYER</Kicker>
              <div
                style={{
                  fontFamily: WP.serif,
                  fontSize: 24,
                  color: WP.goldBright,
                  fontWeight: 600,
                  fontStyle: "italic",
                }}
              >
                Open your tab
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <Field
              label="DISPLAY NAME"
              placeholder="Your name at the table"
              icon="◐"
            />
            <Field
              label="EMAIL"
              type="email"
              placeholder="you@example.com"
              icon="@"
            />
            <Field
              label="PASSWORD"
              type="password"
              placeholder="8+ characters"
              icon="●"
            />
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: WP.sans,
              fontSize: 12,
              color: WP.parchmentDim,
            }}
          >
            <input
              type="checkbox"
              defaultChecked
              style={{ accentColor: WP.gold }}
            />
            <span>
              Send me weekly standings ·{" "}
              <a style={{ color: WP.gold }}>house rules</a>
            </span>
          </div>

          <div style={{ marginTop: 16 }}>
            <PrimaryButton kicker="↳ CLAIM $500 STAKE">
              Sign up for Word Poker
            </PrimaryButton>
          </div>

          <Rule label="OR DEAL IN VIA" />

          <div style={{ display: "flex", gap: 8 }}>
            <GhostButton icon={GoogleGlyph}>Google</GhostButton>
            <GhostButton icon={AppleGlyph}>Apple</GhostButton>
            <GhostButton icon={DiscordGlyph}>Discord</GhostButton>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: WP.sans,
              fontSize: 12,
            }}
          >
            <a style={{ color: WP.parchmentDim, textDecoration: "underline" }}>
              Continue as guest
            </a>
            <span style={{ color: WP.parchmentDim }}>
              Already in?{" "}
              <a style={{ color: WP.gold, fontWeight: 600 }}>Sign in</a>
            </span>
          </div>
        </div>
      </div>

      <AtmosphereMarquee />
    </ScreenBg>
  );
}

function RegisterBuyinMobile() {
  return (
    <ScreenBg>
      <div style={{ height: 54 }} />
      <div
        style={{
          padding: "8px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: WP.serif,
            fontWeight: 700,
            fontSize: 16,
            color: WP.goldBright,
          }}
        >
          Word Poker
        </div>
        <Kicker size={9}>NEW HAND</Kicker>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "14px 18px 16px" }}>
        <Kicker size={10} gap={2.4}>
          THE BUY-IN
        </Kicker>
        <h1
          style={{
            margin: "4px 0 0",
            fontFamily: WP.serif,
            fontWeight: 600,
            fontSize: 42,
            lineHeight: 0.95,
            color: WP.goldBright,
            letterSpacing: -1,
          }}
        >
          Walk in <em style={{ color: WP.gold }}>rich</em>.
        </h1>
        <div
          style={{
            marginTop: 8,
            fontFamily: WP.serif,
            fontStyle: "italic",
            fontSize: 13,
            color: WP.parchmentDim,
            maxWidth: 320,
          }}
        >
          $500 on the house. The first hand is on us.
        </div>

        {/* Mini chip stack */}
        <div
          style={{
            marginTop: 16,
            padding: "16px 14px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.3)",
            border: `1px solid ${WP.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { c: "#d4af37", count: 6 },
              { c: "#d97757", count: 5 },
              { c: "#7ec4cf", count: 4 },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column-reverse",
                  gap: 1,
                }}
              >
                {Array.from({ length: r.count }, (_, j) => (
                  <div
                    key={j}
                    style={{
                      width: 24,
                      height: 6,
                      borderRadius: "50%",
                      background: `radial-gradient(circle at 50% 30%, ${r.c} 0%, ${r.c}cc 60%, ${r.c}66 100%)`,
                      border: "1px solid rgba(0,0,0,0.4)",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <Kicker size={9}>YOUR WELCOME STAKE</Kicker>
            <div
              style={{
                fontFamily: WP.serif,
                fontSize: 24,
                color: WP.gold,
                fontWeight: 700,
                fontStyle: "italic",
              }}
            >
              $500
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Field
            label="DISPLAY NAME"
            placeholder="Your name at the table"
            icon="◐"
          />
          <Field
            label="EMAIL"
            type="email"
            placeholder="you@example.com"
            icon="@"
          />
          <Field
            label="PASSWORD"
            type="password"
            placeholder="8+ characters"
            icon="●"
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <PrimaryButton kicker="↳ CLAIM $500 STAKE">Sign up</PrimaryButton>
        </div>

        <Rule label="OR DEAL IN VIA" />
        <div style={{ display: "flex", gap: 6 }}>
          <GhostButton icon={GoogleGlyph}>Google</GhostButton>
          <GhostButton icon={AppleGlyph}>Apple</GhostButton>
        </div>

        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontFamily: WP.sans,
            fontSize: 12,
            color: WP.parchmentDim,
          }}
        >
          Already in? <a style={{ color: WP.gold, fontWeight: 600 }}>Sign in</a>
        </div>
      </div>

      <AtmosphereMarquee small />
    </ScreenBg>
  );
}

// ═══════════════════════════════════════════════════════════════
// V3 · PICK A SEAT — literal seat selection
// ═══════════════════════════════════════════════════════════════

function PickASeatFelt({ width = 540, height = 360, pickedSeat = 2 }) {
  // 6 seats, one of which is "you"
  const seats = [
    { x: 0.5, y: 0.92, taken: false, label: "Open" },
    { x: 0.12, y: 0.72, taken: true, name: "Mira", color: "#e6b450" },
    { x: 0.06, y: 0.32, taken: false, label: "Open · pick me" },
    { x: 0.5, y: 0.08, taken: true, name: "Ellis", color: "#b8a6f0" },
    { x: 0.94, y: 0.32, taken: true, name: "Raja", color: "#d97757" },
    { x: 0.88, y: 0.72, taken: false, label: "Open" },
  ];
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        margin: "0 auto",
        background:
          "radial-gradient(ellipse at center, #1a4a35 0%, #0e3422 60%, #08291b 100%)",
        borderRadius: width * 0.45,
        border: "3px solid #3a2815",
        boxShadow:
          "inset 0 0 40px rgba(0,0,0,0.6), 0 16px 50px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 10,
          borderRadius: width * 0.43,
          border: `1px solid ${WP.rule}`,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <Kicker size={10} gap={2.4}>
          PICK YOUR SEAT
        </Kicker>
        <div
          style={{
            fontFamily: WP.serif,
            fontStyle: "italic",
            fontSize: 30,
            color: WP.goldBright,
            fontWeight: 600,
            marginTop: 4,
            letterSpacing: -0.5,
          }}
        >
          The Rookie Room
        </div>
        <div
          style={{
            fontFamily: WP.mono,
            fontSize: 10,
            color: WP.parchmentDim,
            letterSpacing: 1.6,
            marginTop: 6,
          }}
        >
          FREE BUY-IN · 60s HANDS
        </div>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 2,
            justifyContent: "center",
          }}
        >
          <TileWord word="HELLO" size={22} points />
        </div>
      </div>

      {seats.map((s, i) => {
        const isPicked = i === pickedSeat;
        if (s.taken) {
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${s.x * 100}%`,
                top: `${s.y * 100}%`,
                transform: "translate(-50%, -50%)",
                textAlign: "center",
              }}
            >
              <MiniAv name={s.name} color={s.color} size={44} />
              <div
                style={{
                  marginTop: 4,
                  fontFamily: WP.mono,
                  fontSize: 8,
                  color: WP.parchmentDim,
                  letterSpacing: 1.2,
                }}
              >
                {s.name.toUpperCase()}
              </div>
            </div>
          );
        }
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: isPicked ? WP.gold : "rgba(0,0,0,0.3)",
                color: isPicked ? "#1a1208" : WP.parchmentDim,
                border: isPicked
                  ? `2px solid ${WP.goldBright}`
                  : `1.5px dashed ${WP.rule}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: WP.serif,
                fontWeight: 600,
                fontSize: isPicked ? 16 : 12,
                fontStyle: "italic",
                boxShadow: isPicked
                  ? `0 0 0 4px rgba(212,175,55,0.18), 0 0 20px rgba(212,175,55,0.4)`
                  : "none",
              }}
            >
              {isPicked ? "MN" : "Open"}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: WP.mono,
                fontSize: 8,
                color: isPicked ? WP.gold : WP.parchmentFaint,
                letterSpacing: 1.2,
              }}
            >
              {isPicked ? "YOUR SEAT" : "PICK ME"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RegisterPickseatDesktop() {
  return (
    <ScreenBg>
      <Masthead tab="register" />

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          minHeight: 0,
        }}
      >
        {/* Left — pick a seat */}
        <div
          style={{
            padding: "40px 48px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Kicker size={11} gap={3}>
            NEW HAND · LIVE TABLE WAITING
          </Kicker>
          <h1
            style={{
              margin: "12px 0 0",
              fontFamily: WP.serif,
              fontWeight: 600,
              fontSize: 56,
              lineHeight: 0.93,
              color: WP.goldBright,
              letterSpacing: -1.6,
            }}
          >
            Pick your <em style={{ color: WP.gold }}>seat</em>.
          </h1>
          <div
            className="hidden md:block"
            style={{
              marginTop: 12,
              fontFamily: WP.serif,
              fontStyle: "italic",
              fontSize: 15,
              color: WP.parchmentDim,
              maxWidth: 460,
            }}
          >
            We've held three at The Rookie Room. First hand deals when you're
            ready — no chips, no clock pressure, just letters.
          </div>

          <div
            style={{
              marginTop: 28,
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PickASeatFelt width={560} height={370} pickedSeat={2} />
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "center",
              gap: 18,
              fontFamily: WP.mono,
              fontSize: 10,
              color: WP.parchmentDim,
              letterSpacing: 1.4,
            }}
          >
            <span>
              <span style={{ color: WP.gold }}>◉</span> YOUR PICK
            </span>
            <span>
              <span style={{ color: WP.parchmentFaint }}>◯</span> OPEN
            </span>
            <span>
              <span style={{ color: WP.parchmentDim }}>●</span> TAKEN
            </span>
          </div>
        </div>

        {/* Right — quick form */}
        <div
          style={{
            padding: "40px 48px",
            background: "rgba(0,0,0,0.25)",
            borderLeft: `1px solid ${WP.rule}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div>
            <Kicker size={11}>SEAT 3 · NORTHWEST</Kicker>
            <div
              style={{
                marginTop: 8,
                fontFamily: WP.serif,
                fontWeight: 600,
                fontSize: 32,
                color: WP.goldBright,
                letterSpacing: -0.6,
                fontStyle: "italic",
              }}
            >
              Welcome, stranger.
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: WP.serif,
                fontStyle: "italic",
                fontSize: 13,
                color: WP.parchmentDim,
                maxWidth: 360,
              }}
            >
              The room introduces itself when you sit. Just a name and how to
              reach you.
            </div>

            <div
              style={{
                marginTop: 22,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <Field
                label="DISPLAY NAME"
                placeholder="What should we call you?"
                icon="◐"
              />
              <Field
                label="EMAIL"
                type="email"
                placeholder="you@example.com"
                icon="@"
              />
              <Field
                label="PASSWORD"
                type="password"
                placeholder="8+ characters"
                icon="●"
              />
            </div>

            {/* Seat color quick swatch */}
            <div style={{ marginTop: 14 }}>
              <Kicker size={9}>SEAT COLOR · YOU CAN CHANGE THIS LATER</Kicker>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                {SEAT_COLORS.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: s.c,
                      cursor: "pointer",
                      boxShadow:
                        i === 0
                          ? `0 0 0 2px ${WP.ink}, 0 0 0 3px ${WP.gold}`
                          : `0 0 0 2px ${WP.ink}`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <PrimaryButton kicker="↳ SIT DOWN">
                Take seat 3 at The Rookie Room
              </PrimaryButton>
            </div>

            <Rule label="OR" />

            <div style={{ display: "flex", gap: 8 }}>
              <GhostButton icon={GoogleGlyph}>Google</GhostButton>
              <GhostButton icon={AppleGlyph}>Apple</GhostButton>
            </div>

            <div
              style={{
                marginTop: 18,
                fontFamily: WP.sans,
                fontSize: 12,
                color: WP.parchmentDim,
                lineHeight: 1.5,
              }}
            >
              Already in?{" "}
              <a style={{ color: WP.gold, fontWeight: 600 }}>Sign in instead</a>
              <br />
              Not ready to make an account?{" "}
              <a style={{ color: WP.parchment, textDecoration: "underline" }}>
                Continue as guest
              </a>{" "}
              — your seat won't be saved.
            </div>
          </div>
        </div>
      </div>

      <AtmosphereMarquee />
    </ScreenBg>
  );
}

function RegisterPickseatMobile() {
  return (
    <ScreenBg>
      <div style={{ height: 54 }} />
      <div
        style={{
          padding: "8px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: WP.serif,
            fontWeight: 700,
            fontSize: 16,
            color: WP.goldBright,
          }}
        >
          Word Poker
        </div>
        <Kicker size={9}>SEATS HELD · 3</Kicker>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "14px 18px 16px" }}>
        <Kicker size={10} gap={2.4}>
          NEW HAND
        </Kicker>
        <h1
          style={{
            margin: "6px 0 0",
            fontFamily: WP.serif,
            fontWeight: 600,
            fontSize: 30,
            lineHeight: 0.98,
            color: WP.goldBright,
            letterSpacing: -0.6,
          }}
        >
          Pick your <em style={{ color: WP.gold }}>seat</em>.
        </h1>

        <div style={{ marginTop: 14 }}>
          <PickASeatFelt width={350} height={220} pickedSeat={2} />
        </div>

        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(212,175,55,0.08)",
            border: `1px solid ${WP.rule}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: WP.gold,
            }}
          />
          <Kicker size={9} color={WP.goldBright}>
            SEAT 3 · NORTHWEST · YOURS
          </Kicker>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Field
            label="DISPLAY NAME"
            placeholder="What should we call you?"
            icon="◐"
          />
          <Field
            label="EMAIL"
            type="email"
            placeholder="you@example.com"
            icon="@"
          />
          <Field
            label="PASSWORD"
            type="password"
            placeholder="8+ characters"
            icon="●"
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <PrimaryButton kicker="↳ SIT DOWN">
            Take seat · The Rookie Room
          </PrimaryButton>
        </div>

        <Rule label="OR" />
        <div style={{ display: "flex", gap: 6 }}>
          <GhostButton icon={GoogleGlyph}>Google</GhostButton>
          <GhostButton icon={AppleGlyph}>Apple</GhostButton>
        </div>

        <div
          style={{
            marginTop: 14,
            textAlign: "center",
            fontFamily: WP.sans,
            fontSize: 12,
            color: WP.parchmentDim,
          }}
        >
          Already in? <a style={{ color: WP.gold, fontWeight: 600 }}>Sign in</a>{" "}
          ·{" "}
          <a style={{ color: WP.parchment, textDecoration: "underline" }}>
            Guest
          </a>
        </div>
      </div>

      <AtmosphereMarquee small />
    </ScreenBg>
  );
}
