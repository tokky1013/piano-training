// 音のクラス
class Tone {
    length = 0;
    #tones = {
        "C": 0,
        "D": 2,
        "E": 4,
        "F": 5,
        "G": 7,
        "A": 9,
        "B": 11,
    }

    constructor(tone) {
        if(typeof tone === "string") this.#fromAbc(tone);
        else if(Number.isInteger(tone)) this.#fromInt(tone);
        else throw new Error(`${tone}をToneオブジェクトに変換できません。`);
    }

    #fromAbc(abc) {
        if(!/^[\^=_]?[A-Ga-g][',]*$/.test(abc)) throw new Error(`${abc}をToneオブジェクトに変換できません。`);

        // 調号を取得
        if(abc.startsWith("^")) {
            this.keySignature = "^";
            abc = abc.substring(1);
        }else if(abc.startsWith("_")) {
            this.keySignature = "_";
            abc = abc.substring(1);
        }else {
            this.keySignature = "";
            if(abc.startsWith("=")) abc = abc.substring(1);
        }

        // 高さを取得
        this.octave = 0;
        if(abc.includes(",")) {
            abc = abc.split(",")
            this.octave -= abc.length - 1;
            abc = abc.join("");
        }
        if(abc.includes("'")) {
            abc = abc.split("'")
            this.octave += abc.length - 1;
            abc = abc.join("");
        }
        if(/[a-g]/.test(abc)) {
            this.octave += 1;
            abc = abc.toUpperCase();
        }

        this.pitchName = abc;
    }

    #fromInt(int) {
        this.octave = Math.floor(int / 12);
        int = int % 12;
        int = int >= 0 ? int : int + 12;

        const keys = Object.keys(this.#tones).reverse();
        for (const key of keys) {
            if(this.#tones[key] <= int) {
                this.pitchName = key;
                this.keySignature = this.#tones[key] === int ? "" : "^";
                break
            }
        }
    }

    toAbc() {
        let abc = this.pitchName;
        if(this.octave < 0) abc += ",".repeat(-this.octave);
        else if(this.octave > 0) abc = abc.toLowerCase() + "'".repeat(this.octave - 1);

        abc = this.keySignature + abc;
        return abc;
    }

    toInt() {
        let int = this.#tones[this.pitchName] + this.octave * 12;
        if(this.keySignature === "^") int += 1;
        else if(this.keySignature === "_") int -= 1;

        return int;
    }

    toStr() {
        let keySignature = "";
        if(this.keySignature === "^") keySignature = "♯";
        else if(this.keySignature === "_") keySignature = "♭";
        
        return this.pitchName + keySignature;
    }

    add(int) {
        return new Tone(this.toInt() + int);
    }

    subtract(int) {
        return this.add(-int);
    }

    equals(other) {
        if(this.compositions.length !== other.compositions.length) return false;
        return this.toInt() === other.toInt();
    }

    flipKeySignature() {
        if(this.keySignature === "^" && this.add(0).keySignature !== "") {
            this.pitchName = this.add(1).pitchName;
            this.keySignature = "_";
        }
        else this.add(0);

        return this;
    }

    get compositions() {
        return [this];
    }

    getChordName() {
        return this.toStr();
    }

    getFlipedChordName() {
        let tone = new Tone(this.toAbc());
        return tone.flipKeySignature().getChordName();
    }

    getItalianSoundName() {
        const tones = {
            'C': 'ド',
            'D': 'レ',
            'E': 'ミ',
            'F': 'ファ',
            'G': 'ソ',
            'A': 'ラ',
            'B': 'シ',
        }
        let name = this.toStr();
        for (const key in tones) {
            name = name.replace(key, tones[key]);
        }
        return name;
    }

    // getAnswer() {
    //     const tones = {
    //         'C': 'ド',
    //         'D': 'レ',
    //         'E': 'ミ',
    //         'F': 'ファ',
    //         'G': 'ソ',
    //         'A': 'ラ',
    //         'B': 'シ',
    //     }

    //     let ans = `${this.toStr()}<br>`
    //     ans += tones[this.pitchName];
    //     if(this.keySignature == "^") ans += "♯";
    //     else if(this.keySignature == "_") ans += "♭";
        
    //     return ans;
    // }
}

// コードの基本クラス
// プロパティはcompositionsとlength
class Chord {
    constructor(root, compositions) {
        const tones = ["C", "D", "E", "F", "G", "A", "B"];

        if(typeof root === "string") root = new Tone(root);
        this.length = Math.max(...compositions);    // 最高音と最低音の差
        this.compositions = [root];

        let compositionNameNum = tones.indexOf(root.pitchName);

        for (const composition of compositions) {
            const tone = root.add(composition);
            compositionNameNum = (compositionNameNum + 2) % 7;

            if(tone.pitchName != tones[compositionNameNum]) tone.flipKeySignature();

            this.compositions.push(tone);
        }
    }

    toStr() {
        let str = "";
        for (const composition of this.compositions) {
            str += composition.toStr();
        }
        return str;
    }

    toAbc() {
        let abc = "";
        for (const composition of this.compositions) {
            abc += composition.toAbc();
        }
        abc = `[${abc}]`
        return abc;
    }

    add(int) {
        // let chord = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        let chord = Object.create(Object.getPrototypeOf(this));
        chord.length = this.length;
        chord.compositions = [];

        for (let i = 0; i < this.compositions.length; i++) {
            chord.compositions.push(this.compositions[i].add(int));
        }
        return chord;
    }

    subtract(int) {
        return this.add(-int);
    }

    equals(other) {
        if(this.compositions.length !== other.compositions.length) return false;
        for (let i = 0; i < this.compositions.length; i++) {
            if(this.compositions[i].toInt() !== other.compositions[i].toInt()) return false;
        }
        return true;
    }

    // getAnswer() {
    //     const tones = {
    //         'C': 'ド',
    //         'D': 'レ',
    //         'E': 'ミ',
    //         'F': 'ファ',
    //         'G': 'ソ',
    //         'A': 'ラ',
    //         'B': 'シ',
    //     }

    //     let ans = `${this.getChordName()}<br>${this.toStr()}<br>`
    //     for (const composition of this.compositions) {
    //         ans += tones[composition.pitchName];
    //         if(composition.keySignature == "^") ans += "♯";
    //         else if(composition.keySignature == "_") ans += "♭";
    //     }
    //     return ans;
    // }

    getChordName() {
        throw new Error("getChordNameはサブクラス内でオーバーライドする必要があります。");
    }

    getFlipedChordName() {
        let chord = Object.create(Object.getPrototypeOf(this));
        chord.compositions = [new Tone(this.compositions[0].toAbc()).flipKeySignature()];

        return chord.getChordName();
    }

    getItalianSoundName() {
        let name = '';
        for (const tone of this.compositions) {
            name += tone.getItalianSoundName();
        }
        return name;
    }
}

// メジャーコード
class MajorChord extends Chord {
    constructor(root) {
        const compositions = [4, 7];        // 根音以外の構成音
        super(root, compositions);
    }

    // コード名を取得する関数
    getChordName() {
        return this.compositions[0].toStr();
    }
}

// マイナーコード
class MinorChord extends Chord {
    constructor(root) {
        const compositions = [3, 7];
        super(root, compositions);
    }

    getChordName() {
        return this.compositions[0].toStr() + "m";
    }
}

// セブンスコード
class SeventhChord extends Chord {
    constructor(root) {
        const compositions = [4, 7, 10];
        super(root, compositions);
    }

    getChordName() {
        return this.compositions[0].toStr() + "7";
    }
}

// マイナーセブンスコード
class MinorSeventhChord extends Chord {
    constructor(root) {
        const compositions = [3, 7, 10];
        super(root, compositions);
    }

    getChordName() {
        return this.compositions[0].toStr() + "m7";
    }
}