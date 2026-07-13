import type { DialogueDefinition, DialogueLine, DialogueSpeaker } from "./types";

const line = (
  speaker: DialogueSpeaker,
  name: string,
  text: string,
): DialogueLine => ({ speaker, name, text });

const dialogue = (id: string, ...lines: readonly DialogueLine[]): DialogueDefinition => ({
  id,
  lines,
});

export const DIALOGUES: Readonly<Record<string, DialogueDefinition>> = {
  dialog_intro_waking: dialogue(
    "dialog_intro_waking",
    line("narrator", "", "雨音だけが、止まった時計の秒針を埋めている。"),
    line("owner_nagi", "ナギ", "……ここ、どこだろう。自分の名前しか、思い出せない。"),
    line("station", "構内放送", "お忘れものは、夜明けまでにお返しください。"),
  ),
  dialog_attendant_intro: dialogue(
    "dialog_attendant_intro",
    line("owner_station_attendant", "顔の見えない駅員", "雨ノ間駅へようこそ。時計は、忘れものを待っています。"),
    line("owner_nagi", "ナギ", "持ち主へ返せば、ここから出られますか。"),
    line("owner_station_attendant", "顔の見えない駅員", "まずは、物と手がかりをよく見比べてください。答えは駅の中に。"),
  ),

  dialog_owner_station_attendant_ambient: dialogue(
    "dialog_owner_station_attendant_ambient",
    line("owner_station_attendant", "顔の見えない駅員", "急がなくて結構です。間違いも、次に見る場所を教えてくれます。"),
  ),
  dialog_owner_station_attendant_returned: dialogue(
    "dialog_owner_station_attendant_returned",
    line("owner_station_attendant", "顔の見えない駅員", "針が進みました。灯った場所には、まだ誰かの言葉があります。"),
  ),
  dialog_owner_child_ambient: dialogue(
    "dialog_owner_child_ambient",
    line("owner_red_boots_child", "赤い長靴の子", "おかあさん、明るいところで待っててって。雨、まだやまないね。"),
  ),
  dialog_owner_child_returned: dialogue(
    "dialog_owner_child_returned",
    line("owner_red_boots_child", "赤い長靴の子", "星があるから、暗くても帰れるよ。おねえちゃんもね。"),
  ),
  dialog_owner_commuter_ambient: dialogue(
    "dialog_owner_commuter_ambient",
    line("owner_navy_bag_commuter", "紺の鞄の通勤客", "朝いちばんの電車だった。妹は、まだ眠っていたはずなのに。"),
  ),
  dialog_owner_commuter_returned: dialogue(
    "dialog_owner_commuter_returned",
    line("owner_navy_bag_commuter", "紺の鞄の通勤客", "冷めても、あの朝の味だけは忘れない。次はちゃんと礼を言うよ。"),
  ),
  dialog_owner_old_listener_ambient: dialogue(
    "dialog_owner_old_listener_ambient",
    line("owner_old_listener", "耳を澄ます老人", "しっ。屋根を打つ音が、四つずつ帰ってくる。昔の町と同じだ。"),
  ),
  dialog_owner_old_listener_returned: dialogue(
    "dialog_owner_old_listener_returned",
    line("owner_old_listener", "耳を澄ます老人", "離れても、雨を聞けば道が戻ってくる。君にも、そんな音があるだろう。"),
  ),
  dialog_owner_student_ambient: dialogue(
    "dialog_owner_student_ambient",
    line("owner_ginkgo_student", "本を抱く学生", "最後のページだけ読めないんです。右の髪が落ちてきて、文字を隠すから。"),
  ),
  dialog_owner_student_returned: dialogue(
    "dialog_owner_student_returned",
    line("owner_ginkgo_student", "本を抱く学生", "『さよなら』の次に、余白がありました。そこへ『またね』と書けそうです。"),
  ),
  dialog_owner_youth_ambient: dialogue(
    "dialog_owner_youth_ambient",
    line("owner_crescent_youth", "月のピンの青年", "写真は苦手だった。でも、あの一枚だけは捨てられなかった。"),
  ),
  dialog_owner_youth_returned: dialogue(
    "dialog_owner_youth_returned",
    line("owner_crescent_youth", "月のピンの青年", "続きは、会ってから言うつもりだった。言葉は遅れても、なくならないんだな。"),
  ),
  dialog_owner_nagi_ambient: dialogue(
    "dialog_owner_nagi_ambient",
    line("owner_nagi", "鏡の中のナギ", "鏡の私は、私より先に何かを握っている。"),
  ),
  dialog_owner_nagi_returned: dialogue(
    "dialog_owner_nagi_returned",
    line("owner_nagi", "ナギ", "忘れずに行く。言えなかったことも、今から言う。"),
  ),

  dialog_item_red_umbrella_correct: dialogue(
    "dialog_item_red_umbrella_correct",
    line("owner_red_boots_child", "赤い長靴の子", "これ、わたしの。ほら、白い星が同じ。"),
    line("owner_nagi", "ナギ", "待っていた明かりまで、一緒に返せた気がする。"),
    line("station", "駅の時計", "止まっていた長針が、十八分を指した。"),
  ),
  dialog_item_star_bento_correct: dialogue(
    "dialog_item_star_bento_correct",
    line("owner_navy_bag_commuter", "紺の鞄の通勤客", "妹の弁当だ。私のために、夜中に作ってくれた。"),
    line("owner_nagi", "ナギ", "蓋の星が、少しだけ朝の色に見えた。"),
    line("station", "駅の時計", "時計は、零時四十七分へ進んだ。"),
  ),
  dialog_item_cassette_player_correct: dialogue(
    "dialog_item_cassette_player_correct",
    line("owner_old_listener", "耳を澄ます老人", "青い糸までそのままだ。町の雨を、もう一度聞かせておくれ。"),
    line("owner_nagi", "ナギ", "小さな機械から、遠い屋根の四拍が鳴る。"),
    line("station", "駅の時計", "時計は、午前一時三十五分へ進んだ。"),
  ),
  dialog_item_silver_hairclip_correct: dialogue(
    "dialog_item_silver_hairclip_correct",
    line("owner_ginkgo_student", "本を抱く学生", "Kの傷……私のです。これで、最後の行まで読めます。"),
    line("owner_nagi", "ナギ", "銀杏の栞が揺れて、本の余白に光が差した。"),
    line("station", "駅の時計", "時計は、午前二時三十一分へ進んだ。"),
  ),
  dialog_item_faded_photo_sticker_correct: dialogue(
    "dialog_item_faded_photo_sticker_correct",
    line("owner_crescent_youth", "月のピンの青年", "AM-042。あの日の写真だ。月の印も、まだ残ってる。"),
    line("owner_nagi", "ナギ", "色あせた二人の間に、言いかけた言葉が見えた。"),
    line("station", "駅の時計", "時計は、午前三時五十六分へ進んだ。"),
  ),
  dialog_item_blank_ticket_correct: dialogue(
    "dialog_item_blank_ticket_correct",
    line("owner_nagi", "鏡の中のナギ", "行き先がないんじゃない。まだ、自分で書いていなかった。"),
    line("owner_nagi", "ナギ", "これは私の切符。置いていくためじゃなく、持って進むための。"),
    line("station", "駅の時計", "時計は、午前四時五十八分へ進んだ。雨音が止んだ。"),
  ),

  dialog_item_red_umbrella_wrong_1: dialogue(
    "dialog_item_red_umbrella_wrong_1",
    line("narrator", "", "相手の足元は乾いていて、傘の柄にも手を伸ばさない。"),
    line("owner_nagi", "ナギ", "赤い色だけで決めるのは早かった。使う人の大きさも見よう。"),
  ),
  dialog_item_red_umbrella_wrong_2: dialogue(
    "dialog_item_red_umbrella_wrong_2",
    line("owner_nagi", "ナギ", "小さな濡れ足跡と、白い星の補修。両方に合う人は、待合室にいる。"),
  ),
  dialog_item_star_bento_wrong_1: dialogue(
    "dialog_item_star_bento_wrong_1",
    line("narrator", "", "蓋の『お姉ちゃんへ』を見せても、相手の影は揺れなかった。"),
    line("owner_nagi", "ナギ", "包み布の色も、持ち物と見比べてみよう。"),
  ),
  dialog_item_star_bento_wrong_2: dialogue(
    "dialog_item_star_bento_wrong_2",
    line("owner_nagi", "ナギ", "妹から姉への弁当。紺の布と同じ色の鞄を持つ人だ。"),
  ),
  dialog_item_cassette_player_wrong_1: dialogue(
    "dialog_item_cassette_player_wrong_1",
    line("narrator", "", "再生ボタンを押しても、相手は四拍の雨音に気づかない。"),
    line("owner_nagi", "ナギ", "音の癖を知っている人を探した方がよさそう。"),
  ),
  dialog_item_cassette_player_wrong_2: dialogue(
    "dialog_item_cassette_player_wrong_2",
    line("owner_nagi", "ナギ", "四拍を指で刻み、青い糸で耳当てを直した人。待合室で聞いたはず。"),
  ),
  dialog_item_silver_hairclip_wrong_1: dialogue(
    "dialog_item_silver_hairclip_wrong_1",
    line("narrator", "", "Kの刻印を見せても、相手は首を横に振った。"),
    line("owner_nagi", "ナギ", "同じ文字を持つ物と、髪を押さえる仕草を探そう。"),
  ),
  dialog_item_silver_hairclip_wrong_2: dialogue(
    "dialog_item_silver_hairclip_wrong_2",
    line("owner_nagi", "ナギ", "銀杏の栞、Kの名札、右の髪。跨線橋で本を抱く人に重なる。"),
  ),
  dialog_item_faded_photo_sticker_wrong_1: dialogue(
    "dialog_item_faded_photo_sticker_wrong_1",
    line("narrator", "", "写真の三日月を向けても、相手の持ち物とは形が合わない。"),
    line("owner_nagi", "ナギ", "印だけでなく、写真袋の番号も確かめよう。"),
  ),
  dialog_item_faded_photo_sticker_wrong_2: dialogue(
    "dialog_item_faded_photo_sticker_wrong_2",
    line("owner_nagi", "ナギ", "三日月のピンと、AM-042の破れた袋。駅員室にいた青年だ。"),
  ),
  dialog_item_blank_ticket_wrong_1: dialogue(
    "dialog_item_blank_ticket_wrong_1",
    line("narrator", "", "白紙の切符を差し出しても、影の乗客は静かに手を引いた。"),
    line("owner_nagi", "ナギ", "この切符だけ、誰かの名前を探すほど遠ざかる気がする。"),
  ),
  dialog_item_blank_ticket_wrong_2: dialogue(
    "dialog_item_blank_ticket_wrong_2",
    line("owner_nagi", "ナギ", "拾う前から鏡の私が持っていた。ポケットの紙片とも、切れ目がつながる。"),
  ),

  dialog_item_red_umbrella_hint_1: dialogue(
    "dialog_item_red_umbrella_hint_1",
    line("owner_station_attendant", "顔の見えない駅員", "最初は待合室を。傘立ての下だけ、床がまだ濡れています。"),
  ),
  dialog_item_red_umbrella_hint_2: dialogue(
    "dialog_item_red_umbrella_hint_2",
    line("owner_station_attendant", "顔の見えない駅員", "足跡の大きさと、布に縫われた印。二つを同時に見てください。"),
  ),
  dialog_item_red_umbrella_hint_3: dialogue(
    "dialog_item_red_umbrella_hint_3",
    line("owner_station_attendant", "顔の見えない駅員", "窓側の赤い長靴の子へ、白い星の傘を。"),
  ),
  dialog_item_star_bento_hint_1: dialogue(
    "dialog_item_star_bento_hint_1",
    line("owner_station_attendant", "顔の見えない駅員", "進んだ時計が駅員室の鍵を開けました。冷たい箱をお忘れなく。"),
  ),
  dialog_item_star_bento_hint_2: dialogue(
    "dialog_item_star_bento_hint_2",
    line("owner_station_attendant", "顔の見えない駅員", "蓋の呼びかけと、包み布の紺色。家族を気にする鞄の人へ。"),
  ),
  dialog_item_star_bento_hint_3: dialogue(
    "dialog_item_star_bento_hint_3",
    line("owner_station_attendant", "顔の見えない駅員", "駅員室の冷蔵庫から、券売機横の紺の鞄の通勤客へ。"),
  ),
  dialog_item_cassette_player_hint_1: dialogue(
    "dialog_item_cassette_player_hint_1",
    line("owner_station_attendant", "顔の見えない駅員", "階段灯がつきました。跨線橋のベンチ下で、小さな回転音がします。"),
  ),
  dialog_item_cassette_player_hint_2: dialogue(
    "dialog_item_cassette_player_hint_2",
    line("owner_station_attendant", "顔の見えない駅員", "録音の四拍と、青い糸の直し跡。耳元をよくご覧ください。"),
  ),
  dialog_item_cassette_player_hint_3: dialogue(
    "dialog_item_cassette_player_hint_3",
    line("owner_station_attendant", "顔の見えない駅員", "跨線橋の機械は、待合室で指を四つ打つ老人のものです。"),
  ),
  dialog_item_silver_hairclip_hint_1: dialogue(
    "dialog_item_silver_hairclip_hint_1",
    line("owner_station_attendant", "顔の見えない駅員", "ホームが開きました。雨水の流れる溝に、細い光があります。"),
  ),
  dialog_item_silver_hairclip_hint_2: dialogue(
    "dialog_item_silver_hairclip_hint_2",
    line("owner_station_attendant", "顔の見えない駅員", "Kの刻印と銀杏の印。右の髪を気にする方を探してください。"),
  ),
  dialog_item_silver_hairclip_hint_3: dialogue(
    "dialog_item_silver_hairclip_hint_3",
    line("owner_station_attendant", "顔の見えない駅員", "ホームの排水溝から、跨線橋で本を抱く学生へ。"),
  ),
  dialog_item_faded_photo_sticker_hint_1: dialogue(
    "dialog_item_faded_photo_sticker_hint_1",
    line("owner_station_attendant", "顔の見えない駅員", "待合室から、古い機械の起動音がしました。四角い光を調べては。"),
  ),
  dialog_item_faded_photo_sticker_hint_2: dialogue(
    "dialog_item_faded_photo_sticker_hint_2",
    line("owner_station_attendant", "顔の見えない駅員", "写真の月印とAM-042。破れた袋を持つ人なら、続きを知っています。"),
  ),
  dialog_item_faded_photo_sticker_hint_3: dialogue(
    "dialog_item_faded_photo_sticker_hint_3",
    line("owner_station_attendant", "顔の見えない駅員", "待合室の写真機から、駅員室の月のピンの青年へ。"),
  ),
  dialog_item_blank_ticket_hint_1: dialogue(
    "dialog_item_blank_ticket_hint_1",
    line("owner_station_attendant", "顔の見えない駅員", "券売機が一枚だけ切符を出しました。行き先は、まだ印字されていません。"),
  ),
  dialog_item_blank_ticket_hint_2: dialogue(
    "dialog_item_blank_ticket_hint_2",
    line("owner_station_attendant", "顔の見えない駅員", "ポケットの紙片と切れ目を。次に、駅員室の鏡を拾う前から見てください。"),
  ),
  dialog_item_blank_ticket_hint_3: dialogue(
    "dialog_item_blank_ticket_hint_3",
    line("owner_station_attendant", "顔の見えない駅員", "最後の持ち主は、あなたです。白紙の切符を鏡のナギへ。"),
  ),

  dialog_exit_station_office_locked: dialogue(
    "dialog_exit_station_office_locked",
    line("owner_station_attendant", "顔の見えない駅員", "その扉は、時計が最初に動けば開きます。まず待合室の傘を。"),
  ),
  dialog_exit_footbridge_locked: dialogue(
    "dialog_exit_footbridge_locked",
    line("owner_station_attendant", "顔の見えない駅員", "跨線橋は消灯中です。二つ目の記憶が階段灯を戻します。"),
  ),
  dialog_exit_platform_locked: dialogue(
    "dialog_exit_platform_locked",
    line("station", "閉鎖案内", "雨のホームは閉鎖中。三つ目の記憶をお待ちください。"),
  ),

  dialog_waiting_clock: dialogue(
    "dialog_waiting_clock",
    line("owner_nagi", "ナギ", "午前零時で止まっている。秒針だけが、雨に合わせて震えている。"),
  ),
  dialog_waiting_photo_booth_dormant: dialogue(
    "dialog_waiting_photo_booth_dormant",
    line("owner_nagi", "ナギ", "古い写真機。電源は落ちているけど、取り出し口だけ少し温かい。"),
  ),
  dialog_waiting_window: dialogue(
    "dialog_waiting_window",
    line("owner_nagi", "ナギ", "窓の外は線路の代わりに、細い雨の筋で埋まっている。"),
  ),
  dialog_concourse_gate: dialogue(
    "dialog_concourse_gate",
    line("owner_nagi", "ナギ", "改札の表示は『また、お越しください』で止まっている。出る方向なのに。"),
  ),
  dialog_concourse_timetable: dialogue(
    "dialog_concourse_timetable",
    line("owner_nagi", "ナギ", "終電の次は空欄。その下に、薄く『始発 5:12』と残っている。"),
  ),
  dialog_concourse_phone: dialogue(
    "dialog_concourse_phone",
    line("owner_nagi", "ナギ", "受話器の向こうは無音。でも、言えなかった名前が喉まで上がってくる。"),
  ),
  dialog_office_ledger: dialogue(
    "dialog_office_ledger",
    line("owner_nagi", "ナギ", "遺失物台帳は六行。最後の持ち主欄だけ、雨でにじんでいる。"),
  ),
  dialog_office_keys: dialogue(
    "dialog_office_keys",
    line("owner_nagi", "ナギ", "鍵札は五つ。『待合』『駅員室』『跨線橋』『ホーム』『朝』。"),
  ),
  dialog_office_mirror: dialogue(
    "dialog_office_mirror",
    line("owner_nagi", "ナギ", "鏡の動きが、ほんの一拍だけ早い。右手には白い紙のようなもの。"),
  ),
  dialog_footbridge_window: dialogue(
    "dialog_footbridge_window",
    line("owner_nagi", "ナギ", "高い窓の向こうに町の灯りはない。それでも雲の端は少し青い。"),
  ),
  dialog_footbridge_notice: dialogue(
    "dialog_footbridge_notice",
    line("owner_nagi", "ナギ", "古い掲示に『別れの言葉は、乗車前に』。誰かの鉛筆で『遅れても可』とある。"),
  ),
  dialog_footbridge_railing: dialogue(
    "dialog_footbridge_railing",
    line("owner_nagi", "ナギ", "手すりの冷たさの奥から、録音されたような雨音が響く。"),
  ),
  dialog_platform_sign: dialogue(
    "dialog_platform_sign",
    line("owner_nagi", "ナギ", "駅名標は『雨ノ間』。隣駅の名は、両方とも白く消えている。"),
  ),
  dialog_platform_vending: dialogue(
    "dialog_platform_vending",
    line("owner_nagi", "ナギ", "売り切れの灯りが一つだけ点く。温かい飲み物の列だ。"),
  ),
  dialog_platform_puddle: dialogue(
    "dialog_platform_puddle",
    line("owner_nagi", "ナギ", "水たまりの空だけ、現実より少し早く明るくなっている。"),
  ),
  dialog_platform_last_train: dialogue(
    "dialog_platform_last_train",
    line("station", "構内放送", "まもなく、行き先の表示されない終電が参ります。"),
    line("owner_nagi", "ナギ", "今なら乗れる。でも、まだ一つだけ胸に引っかかっている。"),
  ),
  dialog_platform_dawn: dialogue(
    "dialog_platform_dawn",
    line("station", "構内放送", "始発まで、あと十四分。"),
    line("owner_nagi", "ナギ", "待つ時間は怖くない。朝に言うことを、もう決めたから。"),
  ),
  dialog_final_choice_before_ticket: dialogue(
    "dialog_final_choice_before_ticket",
    line("owner_station_attendant", "顔の見えない駅員", "終電に乗ることも、ここに残ることもできます。もう少し調べる時間も。"),
  ),
  dialog_final_choice_after_ticket: dialogue(
    "dialog_final_choice_after_ticket",
    line("owner_station_attendant", "顔の見えない駅員", "切符の行き先は、あなたが決めました。始発を待ちますか。それとも灯りを守りますか。"),
  ),
};
