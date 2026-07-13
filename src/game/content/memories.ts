import type { MemoryDefinition } from "./types";

export const MEMORY_DEFINITIONS: readonly MemoryDefinition[] = [
  {
    id: "memory_red_umbrella",
    itemId: "item_red_umbrella",
    title: "明かりの下の星",
    summary: "迎えを待つ子へ、母が白い星を縫った夜。",
    clockTime: "00:18",
    beats: [
      {
        text: "玄関の灯りの下で、母の針が赤い傘の裂け目を行き来する。",
        visual: "赤い傘へ白い布を縫う二つの手",
        color: "#d48b76",
      },
      {
        text: "『この星が見える明るいところで待っていて。必ず迎えに行くから』",
        visual: "傘に灯る小さな白い星",
        color: "#e5c878",
      },
      {
        text: "雨の駅で、赤い長靴は約束の明かりから一歩も離れなかった。",
        visual: "駅灯の輪の中に立つ小さな影",
        color: "#8397ad",
      },
    ],
    afterText: "待合室の灯りが橙色に戻り、駅員室の鍵が外れた。",
  },
  {
    id: "memory_star_bento",
    itemId: "item_star_bento",
    title: "眠っていた朝",
    summary: "妹の弁当に礼を言えないまま、姉が町を出た朝。",
    clockTime: "00:47",
    beats: [
      {
        text: "夜明け前の台所で、妹は星形の海苔を一枚ずつ並べていた。",
        visual: "小さな台所と星柄の弁当箱",
        color: "#d7a56f",
      },
      {
        text: "姉は眠る妹を起こせず、紺の包みを鞄へ入れて家を出た。",
        visual: "閉じた寝室の扉と紺の鞄",
        color: "#647a99",
      },
      {
        text: "列車の中で蓋を開き、初めて『ちゃんと食べてね』の文字を見つけた。",
        visual: "朝焼けを映す窓と開いた蓋",
        color: "#e6bd84",
      },
    ],
    afterText: "券売機と階段の灯りが戻り、跨線橋へ上がれるようになった。",
  },
  {
    id: "memory_cassette_player",
    itemId: "item_cassette_player",
    title: "町を持ち歩く音",
    summary: "遠くへ行く日に、故郷の雨を録音した人の記憶。",
    clockTime: "01:35",
    beats: [
      {
        text: "古い家の軒先で、若い日の老人が録音ボタンを押した。",
        visual: "雨だれの下に置かれたカセットプレーヤー",
        color: "#6f91a5",
      },
      {
        text: "瓦を打つ雨は、四拍ずつ。母が戸を叩く合図と同じだった。",
        visual: "四つの雨粒と開く木戸",
        color: "#9aab9c",
      },
      {
        text: "知らない町の部屋でも、その音を聞けば帰る道を思い出せた。",
        visual: "暗い部屋を横切る故郷の屋根の光",
        color: "#7389aa",
      },
    ],
    afterText: "途切れていた構内放送が一度だけ鳴り、雨のホームが開いた。",
  },
  {
    id: "memory_silver_hairclip",
    itemId: "item_silver_hairclip",
    title: "余白の『またね』",
    summary: "言えなかった別れを、別の言葉へ書き換えた記憶。",
    clockTime: "02:31",
    beats: [
      {
        text: "銀杏の散るホームで、学生は右髪を留め、最後のページを開いた。",
        visual: "黄色い葉と銀色の髪留め",
        color: "#d2aa55",
      },
      {
        text: "向かいの人へ『さよなら』と言おうとして、声は列車の音に消えた。",
        visual: "すれ違う二人の影と白い列車",
        color: "#8797aa",
      },
      {
        text: "本の余白に『またね』と書くと、次の行へ進める気がした。",
        visual: "余白へ置かれた短い一行",
        color: "#e4cf9c",
      },
    ],
    afterText: "雨脚が弱まり、待合室の古い写真機が低い音を立てて起動した。",
  },
  {
    id: "memory_faded_photo",
    itemId: "item_faded_photo_sticker",
    title: "写真の続き",
    summary: "写真の裏に残った、最後まで書けなかった約束。",
    clockTime: "03:56",
    beats: [
      {
        text: "写真機の狭い椅子で、二人は笑いながら三日月の印を選んだ。",
        visual: "肩を寄せる二人と三日月のフレーム",
        color: "#b69cab",
      },
      {
        text: "町を出る青年は、写真の裏へ『着いたら――』まで書いて手を止めた。",
        visual: "途中で止まった鉛筆とAM-042の番号",
        color: "#c6aa96",
      },
      {
        text: "言葉の続きは白いままでも、渡したかった気持ちは残っていた。",
        visual: "雨の向こうで重なる二つの手",
        color: "#a8afc1",
      },
    ],
    afterText: "券売機が目を覚まし、行き先の印字されていない切符を一枚だけ吐き出した。",
  },
  {
    id: "memory_blank_ticket",
    itemId: "item_blank_ticket",
    title: "名前のある行き先",
    summary: "忘れようとしたのは、別れではなく伝える勇気だった。",
    clockTime: "04:58",
    beats: [
      {
        text: "現実の駅で、ナギは『明日、町を出る』と打ったまま送信できずにいた。",
        visual: "雨の窓と、送信前で止まった短いメッセージ",
        color: "#718ca5",
      },
      {
        text: "言えなかった相手の名前を忘れれば進めると思い、白い切符を握って目を閉じた。",
        visual: "名前の消えた切符を包む手",
        color: "#9298aa",
      },
      {
        text: "でも前へ進むことは、置いてきた言葉を消すことではなかった。",
        visual: "夜の線路の先に差す青い朝",
        color: "#8fb2c6",
      },
    ],
    afterText: "鏡の動きがナギと重なった。雨は止み、空の端に朝の青が広がった。",
  },
] as const;
