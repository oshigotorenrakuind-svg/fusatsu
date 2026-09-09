export type PageKind = "title" | "blank" | "section" | "body" | "colophon";

export interface PageSpec {
  kind: PageKind;
  section?: string;
  lines: string[];
  folio?: string;
}

export const BOOK_TITLE = "不殺";
export const WORK_TITLE = "私のこれまでについて";
export const AUTHOR = "宮﨑 健太";

const MAX_CHARS = 20;
const LINES_PER_PAGE = 18;

const NO_START = new Set([... "、。！？）」』"]);
const NO_END = new Set([... "「『（"]);

function isSticky(ch: string) {
  return /[0-9A-Za-z]/.test(ch);
}

function startsWithPunct(line: string) {
  const c = [...line][0];
  return !!c && NO_START.has(c);
}

function gluePunct(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (out.length && line && startsWithPunct(line)) {
      out[out.length - 1] += line;
    } else {
      out.push(line);
    }
  }
  return out;
}

function hardWrap(text: string, max: number): string[] {
  const chars = [...text];
  const lines: string[] = [];
  let i = 0;
  while (i < chars.length) {
    const remain = chars.length - i;
    if (remain <= max) {
      lines.push(chars.slice(i).join(""));
      break;
    }
    let n = max;
    while (n > 1 && NO_END.has(chars[i + n - 1]!)) n -= 1;
    while (i + n < chars.length && NO_START.has(chars[i + n]!)) n += 1;
    let tail = 0;
    while (i + n + tail < chars.length && tail < 4 && !NO_START.has(chars[i + n + tail]!)) {
      tail += 1;
    }
    if (
      tail > 0 &&
      tail <= 3 &&
      i + n + tail < chars.length &&
      NO_START.has(chars[i + n + tail]!)
    ) {
      n += tail;
      while (i + n < chars.length && NO_START.has(chars[i + n]!)) n += 1;
    }
    const rest = chars.slice(i + n);
    if (rest.length && rest.every((c) => NO_START.has(c) || c === " " || c === "　")) {
      n = remain;
    }
    if (i + n < chars.length && isSticky(chars[i + n - 1]!) && isSticky(chars[i + n]!)) {
      let k = n;
      while (k > 1 && isSticky(chars[i + k - 1]!)) k -= 1;
      if (k > Math.floor(max * 0.5)) n = k;
    }
    lines.push(chars.slice(i, i + n).join(""));
    i += n;
  }
  return gluePunct(lines);
}

function wrapText(text: string, max = MAX_CHARS): string[] {
  return hardWrap(text.trim(), max);
}

function kanjiNum(n: number): string {
  const d = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (n <= 0) return "";
  if (n === 10) return "十";
  if (n < 10) return d[n]!;
  if (n < 20) return "十" + d[n - 10];
  if (n < 30) return "二十" + d[n - 20];
  if (n < 40) return "三十" + d[n - 30];
  return String(n);
}

type Block =
  | { kind: "section"; section: string }
  | { kind: "para"; text: string }
  | { kind: "colophon"; text: string };

function paginate(blocks: Block[]): PageSpec[] {
  const pages: PageSpec[] = [
    { kind: "title", lines: [WORK_TITLE, AUTHOR] },
    { kind: "blank", lines: [] },
  ];

  let cur: PageSpec = { kind: "body", lines: [] };
  let used = 0;

  const flush = () => {
    if (cur.kind === "body" && cur.lines.length === 0) return;
    if (cur.kind === "section" && cur.lines.length === 0 && !cur.section) return;
    pages.push(cur);
    cur = { kind: "body", lines: [] };
    used = 0;
  };

  const pushLine = (line: string) => {
    if (used >= LINES_PER_PAGE) flush();
    cur.lines.push(line);
    used += 1;
  };

  for (const b of blocks) {
    if (b.kind === "section") {
      flush();
      cur = { kind: "section", section: b.section, lines: [] };
      used = 3;
      continue;
    }

    const wrapped = wrapText(b.text);
    const gap = cur.lines.length > 0 ? 1 : 0;
    if (used + gap + wrapped.length > LINES_PER_PAGE && cur.lines.length > 0) {
      flush();
    }
    if (b.kind === "colophon" && cur.lines.length > 0) flush();
    if (b.kind === "colophon") {
      cur = { kind: "colophon", lines: [] };
      used = 2;
    }
    if (cur.lines.length > 0) pushLine("");
    for (const line of wrapped) pushLine(line);
  }
  flush();

  for (let i = 1; i < pages.length; i++) {
    const curPage = pages[i]!;
    const prevPage = pages[i - 1]!;
    while (
      curPage.lines.length > 0 &&
      startsWithPunct(curPage.lines[0]!) &&
      prevPage.lines.length > 0
    ) {
      const moved = curPage.lines.shift()!;
      prevPage.lines[prevPage.lines.length - 1] += moved;
    }
  }

  while (pages.length % 2 !== 0) pages.push({ kind: "blank", lines: [] });

  let folio = 1;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]!;
    if (p.kind === "title" || p.kind === "blank") continue;
    p.folio = kanjiNum(folio);
    folio += 1;
  }
  return pages;
}

const SOURCE: Block[] = [
  { kind: "section", section: "はじめに" },
  { kind: "para", text: "ここからの文章は、証拠が無い、ただの話です。事実だけを書きますが、全てを信じてもらえないとは分かっています。ただ、私の人間性を判断する材料にしてください。" },
  { kind: "section", section: "幼少期" },
  { kind: "para", text: "私は2005年8月31日に生まれ、現在21歳になります。" },
  { kind: "para", text: "幼い頃から感覚過敏で、特に耳が良く、音に対して過敏だったこともあり、とても無口な子供でした。家自体は割と裕福な方だったと思いますが、家庭環境は決して良いとは言えず、兄に対して虐待を行う父と、そこから逃げるように私にピアノを教えようとする母に嫌悪感を抱き、「自分の本当の居場所はここではない」と幼心に悟っていました。" },
  { kind: "para", text: "耳が良かったこともあり、歌や音楽が大好きになり、無口だったため身体で感情表現するようになりました。今も歌や音楽が大好きで、ダンスが私の生きがいです。" },
  { kind: "section", section: "譲葉との出会い" },
  { kind: "para", text: "小学1年生になったばかりの頃、自転車に乗れるようになった私は、家から少し離れたイオンに一人で遊びに行くのが好きでした。そこで、2つ年下の「譲葉（ゆずりは）」という男の子と出会います。次第に彼のご両親や、私と同い年の姉とも交流を深め、親しくしていただくようになりました。" },
  { kind: "section", section: "2012年8月のこと" },
  { kind: "para", text: "しかし、出会いからしばらく経った2012年8月17日（金）。私は何者かに攫われました。" },
  { kind: "para", text: "遊ぶ約束をしていた譲葉たちが異変に気づき、その3日後の8月20日、譲葉のご両親たちによって東京にいた私は無事に保護されました。" },
  { kind: "para", text: "しかし、さらに恐ろしい事実が判明しました。私が攫われている間、実家である宮﨑家には「宮﨑健太」を名乗る別の子供が帰宅していました。その子供は整形によって私の顔に瓜二つにされており、寡黙な振る舞いや血液型、背丈や体格に至るまで私と同じでした。実の両親は最後まで私との違いに気づかず、否、私を道具として扱っていたことから、私自身をちゃんと見ていなかったのかもしれません。警察への通報もありませんでした。" },
  { kind: "para", text: "そして今現在に至るまで、この日を境に私は実の両親とは会っていません。日本を含め、こうした身分偽装は世界中で実際に行われていることです。私は事例の一つに過ぎません。" },
  { kind: "section", section: "譲葉家と『カラス』" },
  { kind: "para", text: "保護された後、私は譲葉家の一員として暮らすことになりました。私を見つけ出し救い出してくれたのは、譲葉の父である大樹（これ以降は「父」と呼びます）が束ねる組織『カラス』のおかげだったと、後に明かされました。" },
  { kind: "para", text: "父は、まだ幼かった私が助かったのは「私自身の判断の良さがあったからだ」と励ましてくれました。そして、「今後もし同じようなことがあっても自分自身の力で抗えるように」と、カラスが保有する部隊のもとで身体を鍛える訓練を受けさせてくれ、何より「家族になろう」と言ってくれたのです。" },
  { kind: "para", text: "私は実の両親と完全に縁を切り、本当の家族としてここで生きていくことを決心しました。その後は、譲葉や彼の姉で同い年である桜と同じ小学校に入学し、心温まる充実した日々を送ることになります。" },
  { kind: "section", section: "2019年8月31日" },
  { kind: "para", text: "中学に上がり、中学2年生になった2019年8月31日（土）。私の14歳の誕生日を祝うために、家族や友人たちが集まってくれていた夕方のことでした。" },
  { kind: "para", text: "私たちの家は、何者かによる突然の襲撃を受けました。この襲撃により母と父、譲葉の3人が亡くなりました。そして桜は左下腹部の多量出血による意識不明、私は首と右足首の損傷。幸い友人らは買い出しに出掛けており無事でした。" },
  { kind: "para", text: "詳細は書きたく無いです。ただ言えることは、目の前で3人が亡くなりました。桜は数日後に意識を取り戻しました。" },
  { kind: "section", section: "調査と収拾" },
  { kind: "para", text: "後に私は中学を中退し、周りの推薦もあって私は『カラス』の代表に就任。私主導のもと調査を進め、犯人の特定や目的が判明いたしました。そしてあらゆる世界的な繋がりが発覚し、目的を防ぐための調査と作戦が実行されました。" },
  { kind: "para", text: "約1年半に及ぶこの調査の時期は、ちょうど新型コロナウイルスが流行し、世界的に厳しい規制が敷かれていた最中でした。私たちは世界中のあらゆる機関と協力し、すべての事象を公にすることなく事態の収拾にあたりました。" },
  { kind: "para", text: "一連の出来事によって亡くなった方は、身元が判明した方だけで5,227人、身元不明の方が3,005人に上ります。（身元が判明した方のご家族にはすでに事情を説明し、ご遺体はカラス主導のもとで適切に処置させていただきました）。性別や年齢を問わず、本当に多くの方々が巻き込まれ、無残にも命を落としました。" },
  { kind: "para", text: "調査に関わった方々やご遺族からは、「あなたがいたから、この被害数で抑えられたんだよ」というお言葉もいただきました。確かに、救えた命もありました。しかし、すべてを守り切ることはできないのも現実です。" },
  { kind: "para", text: "それでも、改めてここで謝罪させてください。この文章をご覧になっている関係者の皆様、誠に申し訳ございませんでした。" },
  { kind: "section", section: "Tomへ" },
  { kind: "para", text: "亡くなった方の中には、カラスの部隊員であったTomという男も含まれています。彼は私に武術を教えてくれた恩人の一人であり、私のことを非常に気にかけてくれていました。15歳も年が離れているにもかかわらず私と親しくしてくれ、私の下についてくれた大切な仲間でした。" },
  { kind: "para", text: "Tomの奥様とお子様へ、この場を借りて改めて深く謝罪いたします。大変申し訳ありませんでした。" },
  { kind: "para", text: "「あなたがいたから、組織内の犠牲者を1人に抑えることができた」。Tomの奥様とお話しした際、当時まだ15歳だった私に、彼女は大変もったいないお言葉をかけてくださいました。「まだまだ子供のあなたに、こんな思いをさせてごめんね」と。子供であった私を真っ向から信じ、あの日々の結果を私のせいではないと言ってくださったこと。あの日のことは一生忘れません。" },
  { kind: "section", section: "感謝" },
  { kind: "para", text: "私の主導のもと、コロナ禍の混乱の最中であるにもかかわらず、一人ひとりの命と向き合い戦ってくださった医療従事者の方々。作戦に関わった世界中のあらゆる機関の皆様。私を組織の上に立たせてくれたカラス。そして何より、事実を受け入れてくださったご遺族の皆様に、最大の敬意と感謝を申し上げます。本当にありがとうございました。" },
  { kind: "section", section: "その後の生活" },
  { kind: "para", text: "そして私は高校に、ダンス部コーチとその他スポーツのインストラクターを行うという条件のもと入学し、様々な友人に出会い、幸せな学校生活を送ることができました。そして無事卒業し、この経歴によりスポーツインストラクターに就任し、現在大人になりました。" },
  { kind: "para", text: "私の身体には当時の後遺症が残っており、今でも毎日、頭と首の痛みに苛まれながら、それでも何とか生きています。2025年8月、主治医からようやく「通常の日常生活を送っても良い」との許可が下りました。" },
  { kind: "para", text: "6年が経った今でも、上記の調査によって保護した人たちの身元調査及び送還を実施しています。総数が非常に大きく、長い年月が経ちました。あと残り日本人の180人になりました。協力してくださった方々、ありがとうございました。" },
  { kind: "section", section: "最後に" },
  { kind: "para", text: "最後に、これを読んでくれた皆様へ一つ言いたいことがあります。一人では何もできないということです。" },
  { kind: "para", text: "私が組織の上に立つことができたのは、助けてくれる仲間がいるからです。私は頭がずば抜けて良いとかではなく、与えられた情報を処理する能力が高いのと、人間観察能力が高いという二つが突出しているから上に立ちました。日本語しか分からないから、翻訳してくれる。意見を述べると他の視点から指摘をしてくれる。そうやって助けられてきました。" },
  { kind: "para", text: "これを読んでくれた皆様、何か辛いことがあったら全てを投げ捨てて逃げ出して良いんです。他人と比べず、世界で一番辛いのはあなたであると自覚してください。そしてなるべく、自殺しないでください。必ずとは言いません。逃げて逃げて逃げまくって、自分の居場所を探してください。たった一人でもいい、家族でもいい、繋がりを絶やさないでください。今の社会はそれほど悪意にまみれています。" },
  { kind: "para", text: "拙い文章でしたが、閲覧してくださりありがとうございました。" },
  { kind: "colophon", text: "宮﨑 健太" },
];

export const PAGES: PageSpec[] = paginate(SOURCE);
export const PAGE_STAMP = `${PAGES.length}:${PAGES.map((p) => `${p.kind}:${p.section ?? ""}:${p.lines[0] ?? ""}`).join("|")}`;
