#!/usr/bin/env python3
"""Add real CDN images and descriptions to all 4 DANHOV listing pages."""

H1 = "https://www.danhov.com/media/catalog/product/cache/637ba258c3859c45128cee99e1ea5a62/"
H2 = "https://www.danhov.com/media/catalog/product/cache/ea0d58647b4a9824b79cc3dff64d52dc/"

IMAGES = {
    # ── ENGAGEMENT RINGS (H1) ──────────────────────────────────────────────
    # Abbraccio
    "AE520UQ":    H1 + "a/e/ae520uq_r1_1_wg.jpg",
    "AE507UQ":    H1 + "r/_/r_1_2_1.jpg",
    "AE511UQ":    H1 + "r/1/r1_18_2.jpg",
    "AE506UQ":    H1 + "r/_/r_1_1_.jpg",
    "AE530UQ":    H1 + "w/h/white_3__1.png",
    "AE505UQ-PR": H1 + "a/e/ae136_pr_1_rg.jpg",
    "AE538VQ":    H1 + "r/_/r_1_42_1.jpg",
    # Voltaggio
    "VE515P":     H1 + "v/e/ve515p-emerald_wg_1.jpg",
    "V1E510VH":   H1 + "v/e/ve510vh-50_1_yg.jpg",
    "VE508VH":    H1 + "t/e/tension_rush_2_v122_v2_wg_1.jpg",
    "VE506VZ":    H1 + "v/e/ve506_wg_1.jpg",
    "VE535VH":    H1 + "v/e/ve535p-diamond_rg_1.jpg",
    "VE536P":     H1 + "3/_/3_round_wg_1.jpg",
    "VE536VH":    H1 + "2/_/2_round_yg_1.jpg",
    "VE510P":     H1 + "v/e/ve510vh-50_1_yg.jpg",
    "VE508LR":    H1 + "t/e/tension_rush_2_v122_v1_wg_1.jpg",
    "VE534P":     H1 + "v/e/ve534p1_ch_1_wg.jpg",
    "VE535LR":    H1 + "v/e/ve535p-final_yg_1.jpg",
    "VE509P":     H1 + "v/e/ve509p_1_rg.jpg",
    # Classico
    "WE520P":     H1 + "w/e/we520p_r1_wg_1__2.jpg",
    "WE531VQ-R":  H1 + "r/i/ring_1_.jpg",
    "WE532UH":    H1 + "r/1/r1_4_3.jpg",
    # Norme de DANHOV
    "RE601P":     H1 + "l/e/le541p-wg1.jpg",
    "RE573P":     H1 + "r/e/re573p_1_r1_wg.jpg",
    "RE570P":     H1 + "r/_/r_2_1_1_1.jpg",
    "RE578UQ":    H1 + "r/_/r_1_37_4.jpg",
    "RE578UQ-DT": H1 + "r/_/r_1_37_2.jpg",
    "RE573UH":    H1 + "r/e/re573p_r1_wg.jpg",
    "RE589UQ":    H1 + "c/s/cs604_r_wg_1.jpg",
    "RE570UQ":    H1 + "r/_/r_1_1_1_1.jpg",
    "RE591UH":    H1 + "r/_/r_1_39_2.jpg",
    "RE572P":     H1 + "r/e/re572p_r1_wg.jpg",
    # Carezza
    "XE501UH":    H1 + "x/e/xe501uh_w1.jpg",
    "XE101":      H1 + "x/e/xe101-4_upmui7nrymzlglqx.jpg",
    "XE112":      H1 + "x/e/xe112-4_zxri7bauldnqdlfb.jpg",
    "XE110":      H1 + "x/e/xe110-4_zah1xnqpx7mure19.jpg",
    "XE109":      H1 + "x/e/xe109-4_28whiiz3qjdgegh6.jpg",
    "XE106":      H1 + "x/e/xe106-4_orqpsduxtx8nlh17.jpg",
    "XE105":      H1 + "x/e/xe105-4_zxla2t0boxk1rk9i.jpg",
    "XE109-PS":   H1 + "x/e/xe109-ps-4_6qnpfojbvwjshrgi.jpg",
    # Per Lei
    "LE536P":     H1 + "l/e/le133_1_wg.jpg",
    "LE530P":     H1 + "l/e/le530p_2_.png",
    "LE531UQ":    H1 + "r/1/r1_2.jpg",
    "LE533VH":    H1 + "r/_/r_1_wgq_1.png",
    "LE500UH":    H1 + "l/e/le500uh-4_2.jpg",
    "LE540UH":    H1 + "r/_/r_1_28_2.jpg",
    "LE106":      H1 + "l/e/le106-4_n93zykh3iivvtoac.jpg",
    "LE515YQ":    H1 + "l/e/le515yq-4-w_3.jpg",
    # Petalo
    "FE100":      H1 + "f/e/fe100-4_wyoutkuwllx9luo1.jpg",
    "FE104":      H1 + "f/e/fe104-4_fxrlyz3ml9pdr388.jpg",
    "FE105":      H1 + "f/e/fe105-4_cu8o9lshd0emogmx.jpg",
    "FE108":      H1 + "f/e/fe108-4_pmttjjxlszfuz2ak.jpg",
    "FE106":      H1 + "f/e/fe106-4_uwoyksuv8teui2vx.jpg",
    "FE109":      H1 + "f/e/fe109-4_z68gl6h9v3qjar6g_1.jpg",
    "FE107":      H1 + "f/e/fe107-4_oypnx3thm0sco60w.jpg",
    "FE110":      H1 + "f/e/fe110-4_yzebeebliw5xpb4x.jpg",
    # Solo Filo
    "SE108":      H1 + "z/e/ze130-4_rwymkktez7au0360.jpg",
    "SE125":      H1 + "s/e/se125-4_jhnzy4e0nawbhptw.jpg",
    "SE107":      H1 + "z/e/ze127-3_1h1kluaxm1kclyfu.jpg",
    "SE513UQ":    H1 + "r/i/ring_new.png",
    "SE517UH":    H1 + "r/i/ring_2__31.png",
    "SE500UQ":    H1 + "r/i/ring_7_2.png",
    "SE516UQ":    H1 + "r/1/r1_wg_1_9.jpg",
    "SE510UQ":    H1 + "r/_/r_1_8_5.jpg",

    # ── WEDDING BANDS ────────────────────────────────────────────────────────
    "AE536UQ":    H1 + "b/_/b_1_11_2_1.jpg",
    "TB521VA":    H1 + "t/b/tb521va_rg_1.jpg",
    "TB520VA":    H1 + "t/b/tb520va_wg_1.jpg",
    "TB515VA":    H1 + "t/b/tb515va_wg_1.jpg",
    "TM500UA":    H2 + "2/_/2_12_2_1.jpg",
    "TB500UA":    H2 + "t/b/tb500ua_2_1.jpg",
    "TM503P":     H2 + "t/m/tm104-6_cqwaa0kx9cgwbvot.jpg",
    "TB528LR":    H2 + "t/b/tb528va_rg_2.jpg",
    "TM501ZA":    H2 + "t/m/tm501za_m5aonsrpaidxctzg.jpg",
    "TB504VA":    H2 + "t/b/tb504va_yg_2.jpg",
    "TB523VA":    H2 + "t/b/tb523va_wg_2.jpg",
    "TB545CA":    H2 + "t/b/tb545va_rg_2_1.jpg",
    "TB502VA":    H2 + "t/b/tb502va_-_inside_flat_wg_2_2.jpg",
    "TB506VA":    H2 + "t/b/tb506va_-_inside_flat_wg_2_1.jpg",
    "TB544CA":    H2 + "t/b/tb544va_wg_2.jpg",

    # ── FINE JEWELRY (H1) ───────────────────────────────────────────────────
    # Earrings
    "RH513V":     H1 + "6/1/61691790_yg_1_1_.jpg",
    "RH506U":     H1 + "3/6/36667168_1_rg_1.jpg",
    "RH508G":     H1 + "g/r/grp11460_rg_1.jpg",
    "RH500P":     H1 + "r/p/rp500p-er_without_diamond_1_yg.jpg",
    "RH512U":     H1 + "2/6/26544947_wg_1.jpg",
    "RH510U":     H1 + "2/8/28646453_wg_1_1_1.jpg",
    "RH518U":     H1 + "g/r/grp08568_1_wg.jpg",
    "AH501U":     H1 + "a/h/ah501u_cusion_yg_1.jpg",
    "RH503G":     H1 + "c/s/cs644_rg_1_1.jpg",
    "RH505U":     H1 + "3/7/37608556_1_wg_1.png",
    "RH504P":     H1 + "g/r/grp01656_rg_1.jpg",
    "RH502P":     H1 + "6/0/60761442_yg_1_1.jpg",
    # Pendants
    "RP503U":     H1 + "c/h/chamrock_pendant_wg_1.jpg",
    "LP531U":     H1 + "l/e/le_517_125_sz_6_1.jpg",
    "ZP507U":     H1 + "1/_/1_3_2.jpg",
    # Rings & Bands
    "HE500P":     H1 + "r/i/ring-c_round_dai_wg_1.jpg",
    "KB600P":     H1 + "w/h/white_top_1.jpg",
    "HE505P":     H1 + "c/s/cs621_pear_yg_1_2.jpg",
    "HE501P":     H1 + "r/i/ring-c_round_dai-diamond_rg_1.jpg",
    "KB600MA":    H1 + "r/o/rose_top_1.jpg",
    "KB560MA":    H1 + "6/1/61_1_1.jpg",
    "KB557MA":    H1 + "5/8/58_1_1.jpg",
    "KB561MA":    H1 + "6/2/62_1.jpg",
    # Limited Edition
    "TRR100":     H1 + "1/0/100-4pr_dcdrsi3jx2ulscxc.jpg",
    "TRH101":     H1 + "e/a/ear_pearl_w_-_w_qn5tp5zrnibfnf02.jpg",

    # ── MEN'S JEWELRY (H2) ──────────────────────────────────────────────────
    "RM600S":     H2 + "v/m/vm532s-wg2.jpg",
    "RK500P":     H2 + "c/s/cs147_br_3_yg.jpg",
    "RK500P-PLAT":H2 + "c/s/cs147_br_3_wg_1.jpg",
    "RQ500P":     H2 + "c/s/cs147_ch_2_yg.jpg",
    "RQ500P-PLAT":H2 + "c/s/cs147_ch_2_wg_1.jpg",
}

DESCS = {
    # Abbraccio
    "AE520UQ":    "Intertwining diamond-set tendrils spiral upward to cradle a breathtaking center stone.",
    "AE507UQ":    "A cascading pavé halo envelops the center diamond in a luminous, multi-tiered embrace.",
    "AE511UQ":    "Ribbon-like prongs flow seamlessly into a shimmering pavé band in a single sculptural gesture.",
    "AE506UQ":    "Two arching diamond-set rows cross beneath the center stone in a graceful embrace of light.",
    "AE530UQ":    "White gold strands weave a romantic braid of brilliance around a resplendent center diamond.",
    "AE505UQ-PR": "The beloved Abbraccio silhouette reimagined with a pear-shaped center stone in rose gold warmth.",
    "AE538VQ":    "Delicate wire-form prongs suspend the center diamond in a floating, architectural frame of light.",
    # Voltaggio
    "VE515P":     "Signature tension prongs harness electricity to suspend a vivid emerald-cut diamond in mid-air.",
    "V1E510VH":   "Bold Voltaggio arms grip a round brilliant diamond, allowing light to pass through every facet.",
    "VE508VH":    "The iconic Tension Rush design channels raw energy into a breathtaking suspended diamond silhouette.",
    "VE506VZ":    "A refined white gold tension setting presents the center diamond in breathtaking open-air suspension.",
    "VE535VH":    "Cushion-cluster diamonds surround the center gem, elevated by Voltaggio's signature tension artistry.",
    "VE536P":     "Concentric diamond-set prongs orbit the center stone in a celestial expression of Voltaggio brilliance.",
    "VE536VH":    "Yellow gold tension arms extend with architectural precision to embrace a brilliant-cut center diamond.",
    "VE510P":     "A Voltaggio pavé half-halo of brilliant diamonds accentuates the center stone's natural radiance.",
    "VE508LR":    "The legendary Tension Rush holds a Lab-created diamond in suspended luminous perfection.",
    "VE534P":     "Channel-set side diamonds flow toward a center stone held in signature Voltaggio tension.",
    "VE535LR":    "Yellow gold tension prongs elevate a Lab-created diamond above a delicate pavé-set band.",
    "VE509P":     "Rose gold tension arms reach up to suspend a round brilliant diamond in a sculptural rosy arc.",
    # Classico
    "WE520P":     "A timeless cathedral solitaire holds a radiant center stone in six-prong white gold perfection.",
    "WE531VQ-R":  "Graceful tapered white gold prongs elevate a round brilliant diamond in clean, classic splendor.",
    "WE532UH":    "A refined cathedral setting frames the center diamond with understated white gold elegance.",
    # Norme de DANHOV
    "RE601P":     "The Norme signature crescent band cradles a brilliant center stone in a serene architectural frame.",
    "RE573P":     "Sleek converging gold bands meet beneath the center diamond in geometric Norme precision.",
    "RE570P":     "A refined bypass design allows two elegant bands to cross beneath a luminous center stone.",
    "RE578UQ":    "A dazzling opulent cluster frames the center stone in a radiant pavé crown of diamonds.",
    "RE578UQ-DT": "A double-pavé halo towers above the band, lifting the center gem to breathtaking sculptural heights.",
    "RE573UH":    "The clean architectural Norme silhouette channels modern luxury with flawless white gold lines.",
    "RE589UQ":    "Micro-pavé diamonds encircle the center stone in a delicate halo of exceptional brilliance.",
    "RE570UQ":    "An elegant yellow gold bypass design wraps the finger in warm geometric sophistication.",
    "RE591UH":    "Asymmetric gold prongs frame the center diamond in a bold, architecturally modern statement.",
    "RE572P":     "French pavé-set diamonds sweep gracefully beneath the center stone in signature Norme elegance.",
    # Carezza
    "XE501UH":    "Carezza's open-work lattice cradles the diamond in an airy, lace-like embrace of white gold.",
    "XE101":      "Intricate geometric openwork creates a breathtaking negative-space crown for the center diamond.",
    "XE112":      "A crown of delicate gold filaments rises in ornate architectural glory around the center stone.",
    "XE110":      "Inspired by botanical artistry, petal-form prongs unfurl to hold a radiant brilliant gem.",
    "XE109":      "Organic curves of polished gold interlock in a sculptural jeweled embrace beneath the center stone.",
    "XE106":      "A twisting gold ribbon design draws the eye upward to the luminous center diamond.",
    "XE105":      "Fine gold wire-work creates an airy lattice beneath a stunning center stone in Carezza tradition.",
    "XE109-PS":   "The signature Carezza cradle reimagined for a pear-shaped center stone in romantic silhouette.",
    # Per Lei
    "LE536P":     "Mirrored pavé bands converge beneath the center stone in a perfectly balanced Per Lei presentation.",
    "LE530P":     "A softly curved micro-pavé band leads gracefully to an elevated center stone in gentle splendor.",
    "LE531UQ":    "Channel-set diamonds frame the shank on both sides, merging into a sparkling center stone setting.",
    "LE533VH":    "A Voltaggio-inspired half-halo suspends the center stone above a delicate Per Lei pavé band.",
    "LE500UH":    "Classic Per Lei solitaire elegance: four pavé prongs lift the center diamond above a sleek gold band.",
    "LE540UH":    "A floating diamond halo appears to hover around the center stone in luminous Per Lei fashion.",
    "LE106":      "The Per Lei Lab collection presents Lab-created center stones in signature diamond-flanked prongs.",
    "LE515YQ":    "Yellow gold warmth cradles a Lab-created center stone in the beloved Per Lei solitaire style.",
    # Petalo
    "FE100":      "Petal-shaped prongs unfurl organically to cradle the center diamond in a bloom of polished gold.",
    "FE104":      "A sculptural flower-form crown rises from the band to present a radiant brilliant-cut center stone.",
    "FE105":      "Five rounded gold petals curve inward to secure the diamond in a breathtaking floral embrace.",
    "FE108":      "Rose gold petals create a warm, romantic setting reminiscent of a delicately blossoming flower.",
    "FE106":      "Architectural petals in polished gold surround the center stone with modern botanical elegance.",
    "FE109":      "A delicate Petalo bloom cradles the center diamond above a channel-set pavé-detailed shank.",
    "FE107":      "Tapered gold petals rise from a diamond-set base, forming a tiered floral crown for the center stone.",
    "FE110":      "Slim gold petals align in a tulip form, elevating the center diamond in refined botanical splendor.",
    # Solo Filo
    "SE108":      "A single continuous gold thread spirals around a brilliant diamond in masterful Solo Filo artistry.",
    "SE125":      "DANHOV's signature single-thread design cradles the center stone in an impossibly delicate setting.",
    "SE107":      "One unbroken strand of polished gold loops elegantly to secure the center diamond in ethereal grace.",
    "SE513UQ":    "A single pavé-set wire wraps the center diamond in the minimalist Solo Filo tradition.",
    "SE517UH":    "Delicate gold wire traces an organic path around the center diamond in handcrafted artistry.",
    "SE500UQ":    "The original Solo Filo solitaire: a single gold filament sets the center diamond free in airy suspension.",
    "SE516UQ":    "Refined white gold wire prongs hold the center diamond aloft in the most understated of settings.",
    "SE510UQ":    "A Solo Filo setting in white gold surrounds the center stone with a barely-there whisper of light.",
    # Wedding Bands
    "AE536UQ":    "The Abbraccio wedding band mirrors the engagement collection's signature interlocked diamond arcs.",
    "TB521VA":    "Ribbons of rose gold twist elegantly in the Torchon design—a band as expressive as a first dance.",
    "TB520VA":    "White gold strands intertwine in the Torchon wedding band, a wearable sculpture of enduring love.",
    "TB515VA":    "Warm yellow gold ribbons twist in the signature Torchon pattern for a timeless, romantic wedding band.",
    "TM500UA":    "A bold, clean Torchon design scaled for the groom—geometric, refined, and built for a lifetime.",
    "TB500UA":    "The classic Torchon her band: two delicate gold strands entwined in perpetuity.",
    "TM503P":     "Hand-applied milgrain edging graces the Torchon men's band with vintage-inspired sophistication.",
    "TB528LR":    "Rose gold warmth suffuses the Torchon twist, creating a wedding band as tender as the moment itself.",
    "TM501ZA":    "A bold polished men's ring with brushed geometric architecture and an elegant matte-finish interior.",
    "TB504VA":    "Yellow gold strands spiral in the beloved Torchon pattern for a timeless, heirloom-worthy wedding band.",
    "TB523VA":    "Fine pavé diamonds are set along the Torchon twist, adding irresistible sparkle to the iconic design.",
    "TB545CA":    "Pavé diamonds trace the rose gold Torchon spiral for a wedding band of breathtaking dual radiance.",
    "TB502VA":    "A flat-profile Torchon band that wears close and comfortable—love worn every day, all day.",
    "TB506VA":    "A comfort-fit Torchon wedding band in white gold for those who wear their love all day, every day.",
    "TB544CA":    "Yellow gold and pavé diamonds unite in the Torchon band—a dazzling symbol of lasting commitment.",
    # Fine Jewelry Earrings
    "RH500P":     "A brilliant center gemstone rests in a refined yellow gold setting for timeless everyday luxury.",
    "RH504P":     "Organic rose gold curves embrace a center gem in a nature-inspired earring of elegant grace.",
    "RH508G":     "Sculptural rose gold drop earrings frame the face with architectural precision and a diamond flourish.",
    "RH502P":     "Bold yellow gold disc earrings with fine diamond accents for a luminous, statement-making look.",
    "RH513V":     "Cascading yellow gold drops catch the light with every turn in this vibrant fine jewelry statement.",
    "RH518U":     "A contemporary white gold design balances architectural structure with a brilliant diamond detail.",
    "RH506U":     "Delicate rose gold hoops set with a dazzling diamond for an effortless touch of everyday luxury.",
    "RH512U":     "Brilliant white gold studs crowned with a diamond are the ultimate in understated refinement.",
    "RH510U":     "Sleek white gold earrings balance minimalism and sparkle in an elevated everyday fine jewelry piece.",
    "RH503G":     "Rose gold geometric drop earrings with a brilliant diamond detail—clean lines, pure elegance.",
    "AH501U":     "A cushion-cut gemstone set in a yellow gold pavé halo for an earring of vintage glamour.",
    "RH505U":     "White gold pavé studs scatter light in every direction for a quietly brilliant daytime look.",
    # Fine Jewelry Pendants
    "RP503U":     "The DANHOV Shamrock pendant in white gold—a delicate symbol of fortune and enduring elegance.",
    "LP531U":     "A pavé diamond pendant suspends from a fine chain with luminous, understated grace.",
    "ZP507U":     "A geometric gold pendant captures light from every facet in a sculptural fine jewelry statement.",
    # Fine Jewelry Rings & Bands
    "HE500P":     "A diamond-accented fine ring in white gold frames the finger with a timeless halo of brilliance.",
    "KB600P":     "The Yin-Yang fashion band in white gold—a refined symbol of balance in fine jewelry form.",
    "HE504P":     "An emerald-shaped diamond cluster ring in gold captures brilliance in an architecturally bold setting.",
    "HE505P":     "A pear-shaped diamond cluster in a yellow gold halo glows with warmth from every angle.",
    "KB600MA":    "The Yin-Yang band in rose gold and platinum—a harmonious symbol of duality in fine jewelry.",
    "HE501P":     "A rose gold ring with a round brilliant diamond halo that glows with depth and warmth.",
    "KB560MA":    "A sleek stacking band in polished gold—the foundational piece of any curated ring stack.",
    "KB557MA":    "A textured stacking band in polished gold that creates beautiful contrast when layered.",
    "KB561MA":    "Four colors of gold unite in a single band—a chromatic jewel of remarkable craftsmanship.",
    "KB569MA":    "Four colors of 14k gold flow in seamless harmony in this extraordinary multi-tone fine jewelry band.",
    # Fine Jewelry Limited Edition
    "TRR100":     "A limited-edition rose gold and pearl diamond ring—a rare collector's jewel for a singular occasion.",
    "TRH101":     "Limited-edition white gold earrings with a luminous pearl—a heritage-inspired jewel of singular beauty.",
    # Men's
    "RM600S":     "The Sovereign men's ring in white gold delivers bold presence through sleek, architectural refinement.",
    "RK500P":     "A sleek gold bracelet with a brilliant diamond accent—a refined statement of masculine elegance.",
    "RK500P-PLAT":"The platinum RK500P bracelet delivers cool, contemporary luxury with a diamond-set clasp detail.",
    "RQ500P":     "A gold chain pendant with diamond accents for a man who values quiet, intentional fine jewelry.",
    "RQ500P-PLAT":"The platinum RQ500P necklace—cool-toned luxury in a refined chain pendant for the discerning man.",
}

CSS_ADDITION = """
  .prod-img img.prod-real-img {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }
  .prod-card:hover .prod-img img.prod-real-img { transform: scale(1.04); }
  .prod-desc {
    font-family: 'Jost', sans-serif;
    font-size: 12px;
    color: var(--grey);
    line-height: 1.65;
    margin-top: 2px;
  }
"""

def update_card(content, style, img_url, desc):
    style_span = f'<span class="prod-style">{style}</span>'
    search_from = 0

    while True:
        idx = content.find(style_span, search_from)
        if idx == -1:
            break

        # Find the prod-img-placeholder div that precedes this style span
        ph_start = content.rfind('<div class="prod-img-placeholder">', 0, idx)
        if ph_start == -1:
            search_from = idx + 1
            continue

        # The placeholder div closes at the first </div> after ph_start
        ph_end = content.find('</div>', ph_start) + len('</div>')
        old_ph = content[ph_start:ph_end]

        # Build the img tag + hidden fallback placeholder
        new_img_html = (
            f'<img src="{img_url}" alt="{style}" loading="lazy" class="prod-real-img"'
            f" onerror=\"this.style.display='none';"
            f"this.nextElementSibling.style.display='flex'\">\n        "
            + old_ph.replace(
                '<div class="prod-img-placeholder">',
                '<div class="prod-img-placeholder" style="display:none">'
            )
        )

        content = content[:ph_start] + new_img_html + content[ph_end:]

        # Recalculate idx after content shift
        idx = content.find(style_span, ph_start)

        # Add description after prod-name h3
        if desc:
            h3_end = content.find('</h3>', idx) + len('</h3>')
            if '<p class="prod-desc">' not in content[idx:idx + 700]:
                content = (
                    content[:h3_end]
                    + f'\n        <p class="prod-desc">{desc}</p>'
                    + content[h3_end:]
                )

        search_from = content.find(style_span, ph_start) + len(style_span)

    return content


def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inject CSS before </style>
    content = content.replace('</style>', CSS_ADDITION + '</style>', 1)

    # Update each product card
    for style, img_url in IMAGES.items():
        desc = DESCS.get(style, "")
        content = update_card(content, style, img_url, desc)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Updated: {filepath}")


FILES = [
    '/Users/rana/danhov-website/engagement-rings.html',
    '/Users/rana/danhov-website/wedding-bands.html',
    '/Users/rana/danhov-website/fine-jewelry.html',
    '/Users/rana/danhov-website/mens.html',
]

for fp in FILES:
    update_file(fp)

print("\nAll files updated successfully.")
