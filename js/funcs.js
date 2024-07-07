let totalQuestionNum = 10;
let maxLevel = [4, 3]

let synthControl = null;
let modeNum = 0;            // ゲームモードの番号 0:音感, 1:読譜
let continuousCorrectAnswerNum = 0;
let questionNum = 1;
let levelPrev = [null, null];
let modePrev = [null, null];
let ansPrev = null;
let clefPrev = null;
let correctAnswerCount = 0;
let incorrectAnswerCount = 0;
let startTime;
let totalTime = 0;

// scoreと再生バーのIDを渡して楽譜をセットする。再生バーは指定しなくてもいい
// synthControlを返す
// 入力はABC記法で
// clefはGかF
function setAudio(abc, clef, play, hide, scoreId, playId=null) {
    // 楽譜の幅をざっくり計算
    function getWidth(abc) {
        let width = 15;
        if(!abc) {
            width += 159;
        }else {
            width += abc.split('|').length * 120 + 42;
        }
        return width + 'px';
    }

    if(typeof abc !== "string") abc = abc.toAbc();
    let abcString = `
    L: 4/4
    K: C${clef == 'G' ? '' : ' bass'}
    ${abc}|
    `;

    // MIDIプレーヤーの準備
    if(synthControl) synthControl.pause();
    synthControl = new ABCJS.synth.SynthController();
    if(playId) {
        synthControl.load('#' + playId, null, {
            displayLoop: true,
            displayRestart: true,
            displayPlay: true,
            displayProgress: true,
            displayWarp: true
        });
    }
    // 楽譜をレンダリング
    const visualObj = ABCJS.renderAbc(scoreId, abcString);
    // hideがTrueなら楽譜を隠す
    if(hide) {
        $(`#${scoreId} > svg`).css('display', 'none');
        if(playId) $(`#${playId}`).css('display', 'none');
    };

    // #scoreのサイズを調整
    $('#' + scoreId).css({'width': getWidth(abc), 'height': '100px'});

    // MIDIの生成
    const midiBuffer = new ABCJS.synth.CreateSynth();
    midiBuffer.init({visualObj: visualObj[0]}).then(function () {
        // console.log("Synth initialized");
        synthControl.setTune(visualObj[0], false, {}).then(function (response) {
            // console.log("Audio loaded");
            if(play) synthControl.play();
        });
    }).catch(function (error) {
        console.error("Error initializing synth", error);
    });
}

// 問題を生成する
function generateQuestion(level, mode) {
    function getChoiceName(sound) {
        let name = sound.getChordName();
        if(sound.compositions[0].keySignature) name += `(${sound.getFlipedChordName()})`;
        name += `<br><span class="fs-6">(${sound.getItalianSoundName()})</span>`;
        return name
    }

    function getAnswer(sound) {
        let name = sound.getChordName();
        if(sound.compositions[0].keySignature) name += `(${sound.getFlipedChordName()})`;
        name += '<br><span class="fs-3">';
        if(sound.compositions.length !== 1) name += sound.toStr() + ', ';
        name += sound.getItalianSoundName() + '</span>';
        return name;
    }

    if(modeNum === 1 && level >= 2) level ++;

    // 音部記号を決定
    let clef = mode;
    if(clef !== 'G' && clef != 'F') {
        if(mode !== 'both' && level === 1) clef = 'G';
        else clef = Math.random() < 0.5 ? 'G' : 'F';
    }
    let min;
    let max;
    if(modeNum === 0) {
        min = clef === 'G' ? 0 : -20;
        max = clef === 'G' ? 21 : 0;
    }else {
        min = clef === 'G' ? -3 : -24;
        max = clef === 'G' ? 24 : 4;
    }

    // 出題するクラスを取得
    let classes;
    switch (level) {
        case 1:
        case 2:
            classes = [Tone];
            break;
        case 3:
            classes = [MajorChord, MinorChord];
            break;
        case 4:
            classes = [MajorChord, MinorChord, SeventhChord, MinorSeventhChord];
            break;
    }

    // 出題する音を全て配列に入れる
    let subjectArea = [];
    const c = new Tone(0);
    for (const Class of classes) {
        const baseSound = new Class(c.toAbc());
        for (let i = min; i < max - baseSound.length + 1; i++) {
            const sound = baseSound.add(i);
            // 相対音感モードの場合Cを出さない
            if(level <= 2 && mode === 'relative') {
                if(sound.equals(c)) continue;
            }
            // レベル１の場合、シャープ/フラットは無し
            if(level === 1) {
                if(sound.keySignature) continue;
            }
            if(ansPrev) {
                if(sound.equals(ansPrev)) continue;
            }

            subjectArea.push(sound);
        }
    }

    let choices = [];
    let choiceNames = [];
    do {
        const choice = subjectArea.splice(Math.floor(Math.random() * subjectArea.length), 1)[0];
        const choiceName = getChoiceName(choice);
        if(!choiceNames.includes(choiceName)) {
            choices.push(choice);
            choiceNames.push(choiceName);
        }
    } while (choices.length < 4);

    const answerNum = Math.floor(Math.random() * 4);
    const answer = choices[answerNum];
    const play = modeNum === 0;
    const hide = modeNum === 0;
    const abc = (mode === 'relative' ? 'C|' : '') + answer.toAbc();

    setAudio(abc, clef, play, hide, 'score1');                          // 問題をセット
    $('#replay').css('display', modeNum === 0 ? 'block' : 'none');      // もう一度聞くボタンの設定

    let btns = [];
    for (let i = 0; i < choices.length; i++) {
        const choice = choices[i];
        let name = getChoiceName(choice);
        let onclick;
        let classes = 'btn-light btn-lg';

        // onclick
        if(i === answerNum) onclick = 'displayAnswer()';
        else if(modeNum === 0) onclick = 'displayAnswer(false)';
        else onclick = `setBtnColor(${i})`;

        btns.push({'name': name, 'onclick': onclick, 'classes': classes});
    }

    setBtn(btns, grid=true);

    $('#answer').html(getAnswer(answer));
    ansPrev = answer;
    clefPrev = clef;
}

function displayAnswer(correct=true) {
    totalTime += Date.now() - startTime;

    const messageObj = $('#message2');
    const btnMessage = questionNum >= totalQuestionNum ? '結果を見る' : '次へ';
    if(correct) {
        messageObj.text('正解');
        messageObj.removeClass('text-primary');
        messageObj.addClass('text-danger');

        continuousCorrectAnswerNum++;
        correctAnswerCount++;
    }else {
        messageObj.text('不正解');
        messageObj.removeClass('text-danger');
        messageObj.addClass('text-primary');

        continuousCorrectAnswerNum = 0;
        incorrectAnswerCount++;
    }
    $('#continuous-correct-answer-num').text(continuousCorrectAnswerNum);

    setBtn([{'name': btnMessage, 'onclick': 'goNextQuestion();', 'classes': 'btn-light btn-lg'}]);

    setAudio(ansPrev.toAbc(), clefPrev, false, false, 'score2', 'play');     // 答えをセット

    displayPage(2);
}

function displayResult() {
    let terms;
    if(modeNum === 0) {
        let accuracy = (100 * correctAnswerCount / totalQuestionNum).toFixed(1);
        terms = [
            {'name': 'レベル', 'value': $("#level").val(), 'unit': ''},
            {'name': '正解数', 'value': correctAnswerCount, 'unit': '問'},
            {'name': 'ミス', 'value': incorrectAnswerCount, 'unit': '回'},
            {'name': '正答率', 'value': accuracy, 'unit': '%'},
        ];
    }else {
        const miss = Math.min(incorrectAnswerCount, 999);
        const averageSolutionTime = Math.min(((totalTime / 1000 / totalQuestionNum).toFixed(1)), 999).toFixed(2);
        terms = [
            {'name': 'レベル', 'value': $("#level").val(), 'unit': ''},
            {'name': 'ミス', 'value': miss, 'unit': '回'},
            {'name': '平均解答時間', 'value': averageSolutionTime, 'unit': '秒'},
        ];
    }

    let html = '';
    for (const term of terms) {
        html += `<p>${term['name']}</p><p>:</p><p>${term['value']}</p><p>${term['unit']}</p>`
    }
    $('#result-container').html(html);

    // ボタン
    let btns = $("#level").val() - 0 === maxLevel[modeNum] ? [] : [{'name': '次のレベルへ', 'onclick': 'goNextLevel()', 'classes': 'btn-light btn-lg'}];
    btns = btns.concat([
        {'name': 'もう一度挑戦する', 'onclick': 'prepareGame(modeNum);', 'classes': 'btn-light btn-lg'},
        {'name': '一覧へ', 'onclick': 'openMenu();', 'classes': 'text-white only-smartphone'},
    ]);
    setBtn(btns);

    displayPage(3);
}

function goNextLevel() {
    prepareGame(modeNum);
    $("#level").val($("#level").val() - (-1) + "");
}

// ボタンを赤くする 間違いを選んだ前提
function setBtnColor(num) {
    for (let i = 0; i < 4; i++) {
        const btn = $('#btn' + i);
        if(i === num) {
            btn.removeClass('btn-light');
            btn.addClass('btn-danger');
        }else {
            btn.removeClass('btn-danger');
            btn.addClass('btn-light');
        }
    }

    // 連続正解数をゼロに
    continuousCorrectAnswerNum = 0;
    $('#continuous-correct-answer-num').text(continuousCorrectAnswerNum);
    incorrectAnswerCount++;     //間違えた数を追加
}

// 最後にsetAudioでセットした音を流す
function play() {
    synthControl.setProgress(1);
    synthControl.pause();
    synthControl.play();
}

// メニューをひらく
function openMenu() {
    $('#menu').prop('checked', true);
}
// メニューを閉じる
function closeMenu() {
    $('#menu').prop('checked', false);
}

// btnsは表紙するテキストと押された時の関数のペアの辞書
function setBtn(btns, grid=false) {
    const btnContainer = $('#btn-container');
    let btnClass;

    btnContainer.empty();

    if(grid) {
        btnContainer.removeClass('vertical');
        btnContainer.addClass('grid');
        btnClass = 'grid-btn';
    }else {
        btnContainer.removeClass('grid');
        btnContainer.addClass('vertical');
        btnClass = 'vertical-btn';
    }

    for (let i = 0; i < btns.length; i++) {
        const btn = btns[i];
        const classes = btnClass + ' ' + btn['classes'];
        btnContainer.append(`<button id="btn${i}" onclick="${btn['onclick']}" class="btn  ${classes}">${btn['name']}</button>`);
    }
}

// numページ目を表示する
function displayPage(num) {
    for (let i = 0; i < 4; i++) {
        $(`#page${i}`).css('display', i === num ? 'flex' : 'none');
    }
    // if
}

function prepareGame(mode) {
    displayPage(0);

    // 正解数、ミス、かかった総時間、連続正解数、問題番号をリセット
    correctAnswerCount = 0;
    incorrectAnswerCount = 0;
    totalTime = 0;
    continuousCorrectAnswerNum = 0;
    questionNum = 0;
    $('#continuous-correct-answer-num').text(continuousCorrectAnswerNum);
    $('#question-num').text(1);
    $('#total-question-num').text('/' + totalQuestionNum);

    // 前回の答えをリセット
    ansPrev = null;

    // モードの番号を設定
    modeNum = mode;

    // レベル選択の設定
    const levelObj = $('#level');

    levelObj.empty();
    for (let level = 1; level <= maxLevel[modeNum]; level++) {
        levelObj.append(`<option value="${level}">${level}</option>`);
    }

    // モード選択の設定
    $('#item-name').text(modeNum === 0 ? 'モード' : '音部記号');
    let options; 
    if(modeNum === 0) {
        options = {
            'relative': '相対音感',
            'absolute': '絶対音感',
        }
    }else {
        options = {
            'G': 'ト音記号',
            'F': 'ヘ音記号',
            'both': '両方',
        }
    }

    const modeObj = $('#mode');
    modeObj.empty();
    for (const key in options) {
        modeObj.append(`<option value="${key}">${options[key]}</option>`);
    }


    if(levelPrev[modeNum]) $('#level').val(levelPrev[modeNum]);
    if(modePrev[modeNum]) $('#mode').val(modePrev[modeNum]);

    // ボタンを準備
    setBtn([{name: 'スタート', onclick: 'goNextQuestion();', classes: 'btn-light btn-lg'}]);
}

function goNextQuestion() {
    if(questionNum >= totalQuestionNum) {
        displayResult();
        return;
    }
    displayPage(1);
    if($('#mode').val() === 'relative') $('#message1').text('ドの次に鳴る音は？');
    else $('#message1').text('この音は？');

    const level = $('#level').val() - 0;
    const mode = $('#mode').val();

    generateQuestion(level, mode);
    startTime = Date.now();

    levelPrev[modeNum] = level;
    modePrev[modeNum] = mode;

    questionNum++;
    $('#question-num').text(questionNum);
}

// function next() {
//     console.log('次へ');
// }


// setBtn([
//     {name: 'Gm<br><span class="fs-6">(ソシ♭レ)</span>', onclick: 'next();', classes: 'btn-light btn-lg'},
//     {name: 'C<br><span class="fs-6">(ドミソ)</span>', onclick: 'next();', classes: 'btn-light btn-lg'},
//     {name: 'B7<br><span class="fs-6">(シレ♯ファ♯ラ)</span>', onclick: 'next();', classes: 'btn-light btn-lg'},
//     {name: 'F♯7 (G♭7)<br><span class="fs-6">(ファ♯ラ♯ド♯ミ)</span>', onclick: 'next();', classes: 'btn-light btn-lg'},
// ], grid=true);

// setBtn([
//     {name: '次のレベルへ', onclick: 'next();', classes: 'btn-light btn-lg'},
//     {name: 'もう一度挑戦する', onclick: 'next();', classes: 'btn-light btn-lg'},
//     {name: '一覧に戻る', onclick: 'openMenu();', classes: 'text-white'},
// ]);