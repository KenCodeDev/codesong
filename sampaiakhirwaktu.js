const figlet = require("figlet");
const colors = require('./color');
const Speaker = require('speaker');
const { Readable } = require('stream');

class AdvancedLyricsPlayer {
  constructor() {
    this.settings = {
      charDelay: 30,
      lineDelay: 800,
      pauseMultiplier: 2.5,
    };

    this.colors = colors;
    this.audioReady = false;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async showTitle(title) {
    return new Promise((resolve) => {
      figlet(
        title,
        {
          font: "Small",
          horizontalLayout: "default",
          verticalLayout: "default",
        },
        (err, data) => {
          if (err) {
            console.log("Something went wrong...");
            console.dir(err);
            return;
          }
          console.log(`\n${this.colors.pink}${data}${this.colors.reset}`);
          resolve();
        }
      );
    });
  }

  async typeLine(line, customDelay = null) {
    const punctuation = [".", "!", "?", ",", ";", ":"];
    const delay = customDelay || this.settings.charDelay;

    process.stdout.write("🎵 ");

    for (let char of line) {
      process.stdout.write(char);

      if (punctuation.includes(char)) {
        await this.sleep(delay * this.settings.pauseMultiplier);
      } else {
        await this.sleep(delay);
      }
    }
    console.log();
  }

  async streamAudioFromURL(url) {
    return new Promise(async (resolve, reject) => {
      console.log(`${this.colors.cyan}🎧 Streaming song...${this.colors.reset}`);
      
      try {
        const { default: audioDecode } = await import('audio-decode');
        const res = await fetch(url);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await audioDecode(Buffer.from(arrayBuffer));

        const { numberOfChannels, sampleRate } = audioBuffer;
        
        console.log(`${this.colors.yellow}Audio Info: ${sampleRate}Hz, ${numberOfChannels} channels${this.colors.reset}`);

        const speaker = new Speaker({
          channels: numberOfChannels,
          bitDepth: 16,
          sampleRate: sampleRate,
          signed: true
        });

        // Convert audio buffer ke format yang benar
        const length = audioBuffer.length;
        const buffer = Buffer.alloc(length * 2 * numberOfChannels);
        
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const channelData = audioBuffer.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            const int16 = sample * 0x7FFF;
            const offset = (i * numberOfChannels + channel) * 2;
            buffer.writeInt16LE(int16, offset);
          }
        }

        const readable = new Readable({
          read() {
            this.push(buffer);
            this.push(null);
          }
        });

        // Tandai audio siap ketika speaker mulai
        speaker.on('open', () => {
          console.log(`${this.colors.green}✅ Music started playing...${this.colors.reset}`);
          this.audioReady = true;
          resolve(true);
        });
        
        speaker.on('error', (err) => {
          console.error(`${this.colors.red}❌ Speaker error: ${err.message}${this.colors.reset}`);
          reject(err);
        });

        readable.pipe(speaker);

      } catch (error) {
        console.error(`${this.colors.red}❌ Audio error: ${error.message}${this.colors.reset}`);
        reject(error);
      }
    });
  }

  async waitForAudioToStart(timeout = 10000) {
    const startTime = Date.now();
    while (!this.audioReady) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Audio timeout - failed to start within 10 seconds');
      }
      await this.sleep(100);
    }
  }

  async startLyrics(lyrics) {
    for (let i = 0; i < lyrics.length; i++) {
      const lineData = lyrics[i];

      if (typeof lineData === "string") {
        await this.typeLine(lineData);
        if (i < lyrics.length - 1) {
          await this.sleep(this.settings.lineDelay);
        }
      } else if (typeof lineData === "object") {
        const { text, delay: customDelay, charDelay } = lineData;

        if (charDelay) {
          await this.typeLine(text, charDelay);
        } else {
          await this.typeLine(text, customDelay ? null : charDelay);
        }

        if (i < lyrics.length - 1) {
          await this.sleep(customDelay || this.settings.lineDelay);
        }
      }

      if (lyrics[i] === "" && lyrics[i + 1] !== "") {
        await this.sleep(this.settings.lineDelay * 2);
      }
    }
  }

  async displayLyrics(title, lyrics, audioURL = null) {
    console.clear();

    await this.showTitle(title);
    console.log(`${this.colors.yellow}${"♪".repeat(50)}${this.colors.reset}\n`);

    if (audioURL) {
      // Mulai proses audio
      const audioPromise = this.streamAudioFromURL(audioURL);
      
      console.log(`${this.colors.magenta}🎶 Waiting for audio to start...${this.colors.reset}`);
      
      // Tunggu sampai audio benar-benar mulai play
      await this.waitForAudioToStart();
      
      console.log(`${this.colors.magenta}🎶 Lyrics start ~${this.colors.reset}\n`);
      
      // Sekarang mulai lirik bersamaan dengan audio yang sudah playing
      await this.startLyrics(lyrics);
      
      // Tunggu audio selesai
      await audioPromise;
    } else {
      console.log(`${this.colors.magenta}🎶 Lyrics start ~${this.colors.reset}\n`);
      await this.sleep(1000);
      await this.startLyrics(lyrics);
    }

    console.log(
      `\n${this.colors.green}✨ Lagu selesai! ✨${this.colors.reset}\n`
    );
  }
}

const songData = {
  title: "Sampai Akhir Waktu",
  lyrics: [
    { text: "Yang ku ingin", charDelay: 80, delay: 1700 },
    { text: "Bukan sekedar", charDelay: 80, delay: 1700 },
    { text: "Hanya untuk pacaran", charDelay: 100, delay: 3200 },
    { text: "Yang kumau", charDelay: 80, delay: 800 },
    { text: "Memberikan seluruh cinta", charDelay: 100, delay: 2100 },
    { text: "Sampai akhir waktu, nantiiii ~~~", charDelay: 100, delay: 2700 },

    { text: "", delay: 700 },

    { text: "(Nada Music)", charDelay: 80, delay: 2000 },

    { text: "", delay: 12300 },

    { text: "Aku tak main main", charDelay: 100, delay: 1000 },
    { text: "Dengan semuaa inii", charDelay: 120, delay: 2700 },

    { text: "", delay: 1000 },

    { text: "Oh (aku akan datang lagii) ~~~", charDelay: 80, delay: 3300 },
    { text: "Meski ibumu melarangg, woo", charDelay: 120, delay: 2500 },
    { text: "(Ku tunjukkan kesungguhan)", charDelay: 80, delay: 2500 },
    { text: "Untuk miliki dirimuuu ~~~", charDelay: 100, delay: 2700 },

    "",

    { text: "Aku tak ingin banyak hal darimu", charDelay: 70, delay: 200 },
    {
      text: "Cukup kesempatan untuk mencintaimu tanpa batas waktu.",
      charDelay: 70,
      delay: 500,
    },

    "",

    { text: "Arigatouuu ~Kenichi Ichi", charDelay: 70, delay: 0 },
  ],
};

const player = new AdvancedLyricsPlayer();

player.displayLyrics(songData.title, songData.lyrics, "http://upload.kendev.my.id/files/1760670459531-089a757dc5cef630ee046adad6dd1a38.mp3");