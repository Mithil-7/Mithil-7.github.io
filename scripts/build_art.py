"""Original profile artwork. Python 3.10+, standard library only."""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
BG, PANEL, LINE = "#09121e", "#101f30", "#23394d"
INK, MUTED, TEAL, GOLD = "#edf4fa", "#9bb0c5", "#58e6c2", "#f4c879"


def text(x, y, value, size=16, color=INK, weight=400, family="Arial, sans-serif"):
    return (f'<text x="{x}" y="{y}" fill="{color}" font-family="{family}" '
            f'font-size="{size}" font-weight="{weight}">{escape(str(value))}</text>')


def rect(x, y, w, h, color=PANEL, radius=8, extra=""):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" '
            f'rx="{radius}" fill="{color}" {extra}/>')


def svg(w, h, title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" role="img" aria-labelledby="title">'
            f'<title id="title">{escape(title)}</title>'
            '<style>@media (prefers-reduced-motion: reduce) '
            '{.motion{display:none}}</style>'
            + rect(1, 1, w-2, h-2, BG, 18, f'stroke="{LINE}"') + body + '</svg>')


def write(name, value):
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / name).write_text(value, encoding="utf-8")


def hero():
    b = text(42, 44, "M / 07     RESEARCH + ENGINEERING", 12, TEAL, 600,
             "monospace")
    b += text(42, 105, "Mithilesh", 56, INK, 700)
    b += text(44, 140, "ADHINARAYANAN", 22, MUTED, 400, "monospace")
    b += text(44, 190, "Signal. Policy. Impact.", 28, TEAL, 700)
    b += text(44, 222, "Learning from noisy data. Building better decisions.", 16)
    b += text(44, 255, "REINFORCEMENT LEARNING  /  QUANT FINANCE  /  APPLIED AI", 11,
              MUTED, 400, "monospace")
    # An original signal-to-policy schematic, not a financial performance chart.
    for x in range(600, 936, 28):
        b += f'<path d="M{x} 52V263" stroke="{LINE}" opacity=".45"/>'
    for y in range(60, 270, 28):
        b += f'<path d="M585 {y}H933" stroke="{LINE}" opacity=".45"/>'
    path = "M595 184L610 178L625 199L640 139L655 156L670 108L685 142L700 118L715 125"
    b += f'<path d="{path}" stroke="{TEAL}" fill="none" stroke-width="3"/>'
    for x, ys in [(756, [107, 150, 193]), (812, [124, 176]), (872, [150])]:
        for y in ys:
            if x == 756:
                b += f'<path d="M715 125L{x} {y}" stroke="{LINE}"/>'
            if x == 812:
                for py in [107, 150, 193]:
                    b += f'<path d="M756 {py}L{x} {y}" stroke="{LINE}"/>'
            if x == 872:
                b += f'<path d="M812 124L872 150L812 176" stroke="{LINE}" fill="none"/>'
            b += f'<circle cx="{x}" cy="{y}" r="7" fill="{BG}" stroke="{GOLD if x == 872 else TEAL}" stroke-width="2"/>'
    b += '<circle class="motion" r="4" fill="#f4c879"><animateMotion dur="4s" repeatCount="indefinite" path="M595 184L610 178L625 199L640 139L655 156L670 108L685 142L700 118L715 125L756 150L812 124L872 150"/></circle>'
    b += text(600, 244, "OBSERVE", 10, MUTED, 400, "monospace")
    b += text(752, 244, "LEARN", 10, MUTED, 400, "monospace")
    b += text(864, 244, "ACT", 10, GOLD, 400, "monospace")
    b += f'<path d="M42 286H918" stroke="{LINE}"/>'
    b += text(44, 316, "SASTRA UNIVERSITY  /  CSE · AI & DS  /  2028", 12, MUTED, 400, "monospace")
    b += text(734, 316, "HOSUR, INDIA", 12, TEAL, 400, "monospace")
    write("hero.svg", svg(960, 342, "Mithilesh Adhinarayanan — Signal, Policy, Impact", b))


def cards():
    projects = [
        ("traffic", "01 / DECISION SYSTEMS", "Adaptive Traffic", "Signals that learn.",
         "Multi-agent control with camera telemetry", "and safety-constrained signal policies.", "DQN · OpenCV · FastAPI · MQTT", TEAL),
        ("crafthaat", "02 / ACCESSIBLE AI", "CraftHaat", "Voice in. Catalog out.",
         "Offline-first artisan listings from voice", "and photos. Self-hosted AI backend.", "Flutter · Whisper · Ollama · FastAPI", GOLD),
        ("openenv", "03 / FINANCIAL DATA", "Exchange Rate OpenEnv", "Clean feeds. Better inputs.",
         "Agent decisions over missing, spiking,", "and stale exchange-rate observations.", "Python · OpenEnv · Docker", "#89b8ff"),
        ("deeplearning", "04 / FOUNDATIONS", "Deep Learning Lab", "Understand it. Then build it.",
         "Models and notebooks developed while", "working through deep learning basics.", "Python · Jupyter · NPTEL learning", "#c0a4ff"),
    ]
    for key, label, name, sub, l1, l2, stack, accent in projects:
        b = text(26, 35, label, 11, accent, 600, "monospace")
        b += text(26, 78, name, 27, INK, 700)
        b += text(26, 109, sub, 16, accent)
        b += text(26, 151, l1, 15, MUTED) + text(26, 174, l2, 15, MUTED)
        b += f'<path d="M26 196H434" stroke="{LINE}"/>'
        b += text(26, 223, stack, 12, INK, 400, "monospace")
        b += rect(26, 244, 54, 3, accent, 1)
        b += text(322, 255, "EXPLORE →", 12, accent, 600, "monospace")
        write(f"project-{key}.svg", svg(460, 276, name, b))


def contribution_art():
    # Snapshot of the public calendar read on 2026-09-28: 538 contributions.
    # Weekly totals are intentionally visualized as a compact activity signal.
    weeks = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
             0, 0, 0, 8, 3, 1, 0, 2, 2, 5, 3, 2, 9, 19, 3, 2, 2, 4,
             2, 2, 16, 7, 0, 4, 2, 2, 1, 4, 2, 2, 1]
    w, h = 960, 248
    b = text(28, 34, "PUBLIC GITHUB SIGNAL / 2025-09-28 → 2026-09-28", 11, TEAL, 600, "monospace")
    b += text(28, 78, "538", 42, INK, 700) + text(108, 77, "contributions", 16, MUTED)
    b += text(108, 101, "in the last year", 12, MUTED)
    b += text(760, 58, "github.com/Mithil-7", 13, TEAL, 400, "monospace")
    chart_x, chart_y, base = 28, 137, 74
    maxv = max(weeks)
    for i, value in enumerate(weeks):
        x = chart_x + i * 18
        height = 4 + round((value / maxv) * 58) if value else 4
        color = "#163849" if value == 0 else "#267e72" if value < 4 else "#44ba91" if value < 10 else "#58e6c2"
        b += rect(x, chart_y + base - height, 10, height, color, 3)
    b += f'<path d="M28 {chart_y+base+1}H930" stroke="{LINE}"/>'
    for i, label in enumerate(["OCT", "JAN", "APR", "JUL", "SEP"]):
        b += text(28 + i * 226, 232, label, 10, MUTED, 400, "monospace")
    b += text(720, 224, "activity is public, not a performance metric", 10, MUTED, 400, "monospace")
    write("contributions.svg", svg(w, h, "538 GitHub contributions in the last year", b))

    # A second, deliberately different rendering: a signal field / city skyline.
    w, h = 960, 188
    b = text(28, 30, "CONTRIBUTION FIELD", 11, GOLD, 600, "monospace")
    b += text(28, 60, "Small commits. Compounding practice.", 22, INK, 700)
    for i, value in enumerate(weeks):
        x = 32 + i * 18
        height = 8 + round((value / maxv) * 78) if value else 8
        color = "#173246" if value == 0 else "#1e5c66" if value < 4 else "#2d9c82" if value < 10 else TEAL
        b += rect(x, 150 - height, 10, height, color, 2)
        if value > 10:
            b += f'<circle cx="{x+5}" cy="{145-height}" r="2" fill="{GOLD}"/>'
    b += f'<path d="M28 151H930" stroke="{LINE}"/>'
    b += text(28, 177, "each column = one week  ·  height = contribution volume  ·  gold = peak weeks", 10, MUTED, 400, "monospace")
    write("signal-field.svg", svg(w, h, "GitHub contribution signal field", b))


if __name__ == "__main__":
    hero()
    cards()
    contribution_art()
    print("Generated hero and four project cards.")
