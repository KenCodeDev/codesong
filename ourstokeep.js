const figlet = require("figlet");
const colors = require("./color");
const Speaker = require("speaker");
const { Readable } = require("stream");

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
        { font: "Small", horizontalLayout: "default", verticalLayout: "default" },
        (err, data) => {
          if (err) return console.error(err);
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
      if (punctuation.includes(char)) await this.sleep(delay * this.settings.pauseMultiplier);
      else await this.sleep(delay);
    }
    console.log();
  }

  async streamAudioFromURL(url) {
    return new Promise(async (resolve, reject) => {
      console.log(`${this.colors.cyan}🎧 Streaming song...${this.colors.reset}`);
      
      try {
        const { default: audioDecode } = await import("audio-decode");
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
          resolve(true); // Audio sudah mulai
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
      await this.sleep(100); // Check every 100ms
    }
  }

  async displayLyrics(title, lyrics, audioURL = null) {
    console.clear();
    await this.showTitle(title);
    console.log(`${this.colors.yellow}${"♪".repeat(50)}${this.colors.reset}\n`);

    if (audioURL) {
      // Mulai proses audio TAPI jangan tunggu selesai
      const audioPromise = this.streamAudioFromURL(audioURL);
      
      console.log(`${this.colors.magenta}🎶 Waiting for audio to start...${this.colors.reset}`);
      
      // TUNGGU sampai audio benar-benar mulai play
      await this.waitForAudioToStart();
      
      console.log(`${this.colors.magenta}🎶 Lyrics start ~${this.colors.reset}\n`);
      
      // SEKARANG mulai lirik bersamaan dengan audio yang sudah playing
      await this.startLyrics(lyrics);
      
      // Tunggu audio selesai (optional)
      await audioPromise;
    } else {
      console.log(`${this.colors.magenta}🎶 Lyrics start ~${this.colors.reset}\n`);
      await this.startLyrics(lyrics);
    }

    console.log(`\n${this.colors.green}✨ Song Ended! ✨${this.colors.reset}\n`);
  }

  async startLyrics(lyrics) {
    for (let i = 0; i < lyrics.length; i++) {
      const lineData = lyrics[i];
      
      if (typeof lineData === "string") {
        await this.typeLine(lineData);
        // Delay untuk baris SELANJUTNYA
        if (i < lyrics.length - 1) {
          await this.sleep(this.settings.lineDelay);
        }
      } else if (typeof lineData === "object") {
        const { text, delay: customDelay, charDelay } = lineData;
        await this.typeLine(text, charDelay || this.settings.charDelay);
        // Delay untuk baris SELANJUTNYA  
        if (i < lyrics.length - 1) {
          await this.sleep(customDelay || this.settings.lineDelay);
        }
      }
      
      // Delay untuk baris kosong
      if (lyrics[i] === "" && lyrics[i + 1] !== "") {
        await this.sleep(this.settings.lineDelay * 2);
      }
    }
  }
}

// Data lagu tetap sama
const songData = {
  title: "Ours To Keep",
  lyrics: [
    { text: "Do you ever feel the need to get away from me?", charDelay: 80, delay: 1500 },
    { text: "Do I bore you?", charDelay: 80, delay: 600 },
    { text: "Or do you want to", charDelay: 100, delay: 600 },
    { text: "Take me from this crowded place to", charDelay: 80, delay: 800 },
    { text: "Somewhere we can find some peace?", charDelay: 70, delay: 700 },
    { text: "And the world", charDelay: 100, delay: 10 },
    { text: "", delay: 500 },
    { text: "Is Ours to Keep", charDelay: 80, delay: 500 },
    { text: "", delay: 3000 },
    { text: "Kenangan indah itu adalah kisah abadi", charDelay: 70, delay: 200 },
    { text: "Dari sebuah cinta yang telah pergi.", charDelay: 70, delay: 500 },
    "",
    { text: "Arigatouuu ~Kenichi Ichi", charDelay: 70, delay: 0 },
  ],
};

// Jalankan
const playerInstance = new AdvancedLyricsPlayer();
playerInstance.displayLyrics(
  songData.title,
  songData.lyrics,
  "https://upload.kendev.my.id/files/1760666816450-838a47023ca26b56abfb26e4824ed2e1.mp3"
);