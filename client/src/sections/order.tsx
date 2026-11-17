const toppingOptions = [
  { name: "Lettuce", color: "#7bbf68" },
  { name: "Tomato", color: "#d7482d" },
  { name: "Cucumber", color: "#8dcf64" },
  { name: "Red onion", color: "#d26471" },
  { name: "Green peppers", color: "#356a38" },
  { name: "Black olives", color: "#393939" },
]

const productOptions = ["Bread", "Protein", "Cheese", "Veggies", "Sauce"]

function OrderSection() {
  return (
    <section className="order-section">
      <style>{`
        * { box-sizing: border-box; }
        .order-section {
          --bg: #f4f0ec;
          --panel: #f9f6f3;
          --panel-strong: #f0e7e1;
          --text: #2b2a2d;
          --muted: #80756f;
          --line: #d8cfc5;
          --peach: #e8a26f;
          --olive: #7e9b5b;
          --sand: #d7a84b;
          --gold: #f3bc4d;
          --dark: #2d2929;
          --shadow: rgba(47, 41, 35, 0.08);
        }

        .order-section {
          min-height: 100vh;
          background: var(--bg);
          font-family: Inter, "Segoe UI", sans-serif;
          color: var(--text);
          padding: 24px 18px 32px;
        }

        .order-shell {
          max-width: 1150px;
          margin: 0 auto;
          background: rgba(255,255,255,0.1);
          border-radius: 18px;
        }

        .order-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px 18px;
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          letter-spacing: 0.04em;
          color: #5d5854;
        }

        .brand-mark {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #cc8b43, #facc77);
          position: relative;
          box-shadow: inset 0 -5px 0 rgba(0,0,0,0.06);
        }

        .brand-mark::before,
        .brand-mark::after {
          content: "";
          position: absolute;
          inset: 0;
          margin: auto;
          background: #f7d68f;
        }

        .brand-mark::before {
          width: 18px;
          height: 10px;
          border-radius: 10px 10px 12px 12px;
          top: 6px;
          box-shadow: 0 8px 0 #f7d68f;
        }

        .brand-mark::after {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          bottom: 2px;
          left: 7px;
        }

        .brand-name {
          font-weight: 700;
          color: #2e2c2b;
        }

        .brand-name small {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.13em;
          display: block;
          color: #7a6d6a;
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 28px;
          list-style: none;
          margin: 0;
          padding: 0;
          font-size: 0.86rem;
          color: #615c5a;
        }

        .header-nav li {
          padding: 10px 0;
          cursor: default;
        }

        .header-nav li.active {
          color: #1d1b1b;
          font-weight: 600;
          position: relative;
        }

        .header-nav li.active::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -2px;
          height: 2px;
          background: #1f1a1a;
          border-radius: 999px;
        }

        .avatar-button {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.06);
          background: linear-gradient(135deg, #fff, #efe4dc);
          display: grid;
          place-items: center;
          box-shadow: 0 8px 18px rgba(80, 66, 54, 0.08);
        }

        .avatar-button::before {
          content: "";
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 40%, #f2d1af 0 30%, #d89d72 31% 100%);
          display: block;
          box-shadow: 0 12px 0 2px #f5d9a9;
        }

        .order-card {
          background: rgba(255,255,255,0.35);
          border: 1px solid var(--line);
          border-radius: 22px;
          box-shadow: 0 16px 36px var(--shadow);
          overflow: hidden;
        }

        .layout {
          display: grid;
          grid-template-columns: 1.38fr 1fr;
          gap: 18px;
          min-height: 500px;
        }

        .product-panel {
          background: var(--panel-strong);
          border-right: 1px solid var(--line);
          padding: 18px 18px 16px;
          display: flex;
          flex-direction: column;
        }

        .panel-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #7f716c;
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          margin-bottom: 6px;
        }

        .panel-label .mini-pill {
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 4px 7px;
          background: rgba(255,255,255,0.38);
        }

        .product-panel h2 {
          margin: 4px 0 0;
          font-size: clamp(1.8rem, 3vw, 2.6rem);
          line-height: 1.05;
          letter-spacing: -0.06em;
          font-weight: 700;
          color: #2e2b2a;
        }

        .image-stage {
          margin-top: 16px;
          border-radius: 18px;
          background: linear-gradient(180deg, #d7c5af, #c4b29d 40%, #d4a96a 41%, #d69d4d 100%);
          position: relative;
          min-height: 240px;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.04);
        }

        .sandwich {
          position: absolute;
          left: 50%;
          bottom: 28px;
          transform: translateX(-50%);
          width: 82%;
          max-width: 620px;
          height: 190px;
          filter: drop-shadow(0 18px 15px rgba(72, 48, 32, 0.12));
        }

        .bread-top,
        .bread-bottom {
          position: absolute;
          left: 0;
          right: 0;
          border-radius: 42% 42% 38% 38% / 80% 80% 22% 22%;
          background: linear-gradient(180deg, #f0c177, #d99539 60%, #bf7620 100%);
          box-shadow: inset 0 -8px 0 rgba(145,85,16,0.16);
        }

        .bread-top {
          top: 0;
          height: 78px;
          border-bottom-left-radius: 44% 68%;
          border-bottom-right-radius: 44% 68%;
          overflow: hidden;
        }

        .bread-top::before {
          content: "";
          position: absolute;
          inset: 10px 18px 12px 18px;
          background: repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.18) 0 6px,
            rgba(255,255,255,0) 6px 16px
          );
          border-radius: 46%;
          opacity: 0.35;
        }

        .bread-top::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          top: 10px;
          height: 18px;
          background: radial-gradient(circle, rgba(255,255,255,0.3) 0 18%, rgba(255,255,255,0) 19%);
          background-size: 19px 18px;
          border-radius: 50%;
        }

        .bread-bottom {
          bottom: 0;
          height: 62px;
          border-radius: 38% 38% 50% 50% / 18% 18% 80% 80%;
          background: linear-gradient(180deg, #d69a38, #bc7016);
        }

        .condiment-layer {
          position: absolute;
          left: 10%;
          right: 10%;
          height: 38px;
          background: linear-gradient(180deg, #fbd89a, #f0d68d);
          border-radius: 18px;
        }

        .lettuce {
          position: absolute;
          left: 16%;
          right: 16%;
          top: 54px;
          height: 36px;
          background: repeating-linear-gradient(
            90deg,
            #9fd16c 0 14px,
            #77a443 14px 28px,
            #7ab66c 28px 42px,
            #7db75a 42px 52px
          );
          border-radius: 18px;
          box-shadow: inset 0 0 0 1px rgba(17, 77, 26, 0.2);
        }

        .meat {
          position: absolute;
          left: 12%;
          right: 12%;
          top: 78px;
          height: 40px;
          background: linear-gradient(180deg, #bb5139, #8d2d20);
          border-radius: 18px 18px 24px 24px;
          box-shadow: inset 0 0 0 1px rgba(75, 17, 11, 0.2);
        }

        .meat::before,
        .meat::after {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.1) 0 10px,
            rgba(0,0,0,0.03) 10px 17px,
            rgba(255,255,255,0.06) 17px 28px
          );
          border-radius: inherit;
        }

        .cheese {
          position: absolute;
          left: 18%;
          right: 18%;
          top: 94px;
          height: 18px;
          background: linear-gradient(180deg, #f7d762, #e2b93d);
          border-radius: 10px;
          box-shadow: 0 0 0 2px rgba(170, 122, 27, 0.2);
        }

        .tomato {
          position: absolute;
          left: 20%;
          right: 20%;
          top: 112px;
          height: 20px;
          background: radial-gradient(circle at 50% 50%, #d55c3c 0 32%, #b4332c 33% 100%);
          border-radius: 999px;
          box-shadow: inset 0 0 0 2px rgba(140, 34, 20, 0.2);
        }

        .topper-bits {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .topper-bits span {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #d7e970;
          box-shadow: inset 0 0 0 1px rgba(59, 96, 33, 0.15);
        }

        .topper-bits span:nth-child(1) { left: 24%; top: 58px; }
        .topper-bits span:nth-child(2) { left: 46%; top: 62px; }
        .topper-bits span:nth-child(3) { left: 65%; top: 54px; }
        .topper-bits span:nth-child(4) { left: 32%; top: 120px; }
        .topper-bits span:nth-child(5) { left: 60%; top: 116px; }

        .builder-panel {
          background: rgba(255,255,255,0.18);
          padding: 20px 18px 16px;
        }

        .builder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .builder-title {
          margin: 0;
          font-size: clamp(1.5rem, 2vw, 2.3rem);
          line-height: 1.1;
          letter-spacing: -0.05em;
          font-weight: 700;
        }

        .builder-tabs {
          display: flex;
          gap: 10px;
          list-style: none;
          margin: 0 0 18px;
          padding: 0;
          flex-wrap: wrap;
        }

        .builder-tabs li {
          padding: 8px 14px;
          border: 1px solid transparent;
          border-radius: 999px;
          color: #685f5d;
          background: rgba(255,255,255,0.2);
          font-size: 0.75rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .builder-tabs li.active {
          background: #1d1d1d;
          color: white;
          border-color: rgba(0,0,0,0.08);
        }

        .topping-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 8px;
        }

        .topping-item {
          background: rgba(255,255,255,0.32);
          border: 1px solid rgba(95,79,69,0.1);
          border-radius: 12px;
          padding: 10px 8px 8px;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 8px;
          min-height: 118px;
        }

        .topping-item.selected {
          border-color: rgba(35, 32, 30, 0.25);
          box-shadow: 0 0 0 2px rgba(35, 32, 30, 0.08);
        }

        .topping-swatch {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(44, 37, 34, 0.08);
          background: var(--swatch-color, #dfe7d2);
          position: relative;
          overflow: hidden;
        }

        .topping-item .name {
          font-size: 0.66rem;
          color: #4e4a48;
          font-weight: 600;
        }

        .topping-item .badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 0.7rem;
          background: white;
          border: 1px solid rgba(0,0,0,0.08);
          color: #4d4c4d;
        }

        .builder-summary {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.7rem;
          color: #625d5b;
        }

        .summary-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 4px 8px;
          border: 1px solid rgba(80,72,69,0.1);
          border-radius: 999px;
          background: rgba(255,255,255,0.2);
        }

        .summary-pill strong { color: #272323; }

        .bottom-bar {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 18px;
          margin-top: 12px;
          align-items: end;
        }

        .chat-box {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          padding: 8px 0 0 4px;
        }

        .speech {
          position: relative;
          background: rgba(255,255,255,0.3);
          border: 2px solid #171414;
          border-radius: 18px 18px 18px 0;
          padding: 12px 18px 10px;
          max-width: 360px;
          box-shadow: 0 8px 18px rgba(30, 23, 17, 0.08);
        }

        .speech::before {
          content: "";
          position: absolute;
          left: -11px;
          bottom: 12px;
          width: 18px;
          height: 18px;
          border-left: 2px solid #171414;
          border-bottom: 2px solid #171414;
          background: rgba(255,255,255,0.3);
          transform: rotate(35deg);
          border-radius: 0 0 0 8px;
        }

        .speech p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.4;
          color: #443f3d;
        }

        .speech .tiny {
          font-size: 0.7rem;
          opacity: 0.8;
          margin-top: 8px;
        }

        .chat-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(180deg, #f0d9c2, #d2a174);
          position: relative;
          box-shadow: inset 0 -8px 0 rgba(0,0,0,0.06);
        }

        .chat-avatar::before {
          content: "";
          position: absolute;
          left: 11px;
          top: 12px;
          width: 22px;
          height: 18px;
          background: #f3c996;
          border-radius: 10px 10px 12px 12px;
        }

        .chat-avatar::after {
          content: "";
          position: absolute;
          left: 10px;
          bottom: 6px;
          width: 24px;
          height: 12px;
          background: #f7d0a3;
          border-radius: 12px;
          box-shadow: 0 -5px 0 0 #d75f42;
        }

        .order-summary {
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(85,75,70,0.1);
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .summary-meta {
          color: #554f4d;
          font-size: 0.72rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .summary-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 10px;
        }

        .summary-main .price {
          font-size: 2.1rem;
          letter-spacing: -0.06em;
          font-weight: 800;
          color: #1a1a1a;
        }

        .summary-main .price small {
          font-size: 0.8rem;
          color: #6a615d;
          font-weight: 600;
          letter-spacing: 0.03em;
          margin-left: 6px;
        }

        .qty-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.3);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 999px;
          padding: 6px 8px;
          font-weight: 700;
          color: #363433;
        }

        .qty-box .operator {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(0,0,0,0.04);
        }

        .cta-button {
          border: none;
          border-radius: 999px;
          background: linear-gradient(180deg, #1d1b1a, #2a2626);
          color: white;
          font-weight: 700;
          padding: 12px 22px;
          box-shadow: 0 12px 18px rgba(34, 29, 27, 0.16);
        }

        @media (max-width: 980px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .product-panel {
            border-right: none;
            border-bottom: 1px solid var(--line);
          }

          .bottom-bar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .order-header {
            flex-wrap: wrap;
            gap: 16px;
          }

          .header-nav {
            order: 3;
            width: 100%;
            overflow-x: auto;
            justify-content: space-between;
            padding-bottom: 4px;
          }

          .builder-tabs {
            justify-content: center;
          }

          .topping-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .summary-main {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="order-shell">
        <header className="order-header">
          <div className="brand-wrap" aria-label="Long Story Sub brand">
            <div className="brand-mark" aria-hidden="true" />
            <div className="brand-name">
              Long Story
              <small>SUB</small>
            </div>
          </div>

          <nav aria-label="Main navigation">
            <ul className="header-nav">
              <li>New &amp; Popular</li>
              <li className="active">Order Here!</li>
              <li>About Us</li>
            </ul>
          </nav>

          <div className="avatar-button" aria-label="Account" />
        </header>

        <div className="order-card">
          <div className="layout">
            <div className="product-panel">
              <div className="panel-label">
                <span>Your sub order</span>
                <span className="mini-pill">Fresh made</span>
              </div>

              <h2>Made just for you.</h2>

              <div className="image-stage" aria-label="Illustration of a sandwich">
                <div className="sandwich">
                  <div className="bread-top" />
                  <div className="lettuce" />
                  <div className="meat" />
                  <div className="cheese" />
                  <div className="tomato" />
                  <div className="topper-bits">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="bread-bottom" />
                </div>
              </div>
            </div>

            <div className="builder-panel">
              <div className="builder-header">
                <h3 className="builder-title">Bring on the crunch.</h3>
              </div>

              <ul className="builder-tabs" aria-label="Build options">
                {productOptions.map((option, index) => (
                  <li key={option} className={index === 0 ? "active" : ""}>
                    {option}
                  </li>
                ))}
              </ul>

              <div className="topping-grid">
                {toppingOptions.map((topping, index) => (
                  <div
                    key={topping.name}
                    className={index === 0 ? "topping-item selected" : "topping-item"}
                    style={{ ["--swatch-color" as string]: topping.color }}
                  >
                    <div className="topping-swatch" aria-hidden="true" />
                    <div className="badge" aria-hidden="true">{index === 0 ? "✓" : ""}</div>
                    <div className="name">{topping.name}</div>
                  </div>
                ))}
              </div>

              <div className="builder-summary">
                <span>Your add-ons</span>
                <span className="summary-pill">
                  <strong>5</strong> selected
                </span>
              </div>
            </div>
          </div>

          <div className="bottom-bar">
            <div className="chat-box" aria-label="Text input suggestion">
              <div className="speech">
                <p>What would you like on your sandwich?</p>
                <div className="tiny">Add avocado, extra onion, or spice it up.</div>
              </div>
              <div className="chat-avatar" aria-hidden="true" />
            </div>

            <div className="order-summary">
              <div>
                <div className="summary-meta">Your turkey</div>
                <div className="summary-main">
                  <div className="qty-box" aria-label="Quantity selector">
                    <span className="operator">−</span>
                    <span>1</span>
                    <span className="operator">+</span>
                  </div>
                  <div className="price">
                    $9.50
                  </div>
                </div>
              </div>
              <button type="button" className="cta-button">
                Add to bag
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default OrderSection