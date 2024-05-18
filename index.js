const sodium = require('libsodium-wrappers');
const { Client, GatewayIntentBits } = require('discord.js');
const { prefix, token } = require('./config.json');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

(async () => {
  await sodium.ready;
})();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

let queue = [];
let playing = false;
let loop = false;
let currentSong = null;
let voiceConnection = null;
let audioPlayer = createAudioPlayer();

client.once('ready', () => {
  console.log('Ready!');
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'p') {
    const query = args.join(' ');
    if (!message.member.voice.channel) {
      return message.channel.send('```Connect to a voice channel, you baka >.<```');
    }
    if (!voiceConnection) {
      voiceConnection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });
      voiceConnection.subscribe(audioPlayer);
    }
    await search(query, message);
    if (!playing) {
      playMusic(message);
    }
  } else if (command === 's') {
    if (voiceConnection && playing) {
      message.channel.send('```They see me skippin\', they hatin\'~```');
      loop = false;
      audioPlayer.stop();
    }
  } else if (command === 'pause') {
    if (voiceConnection && playing) {
      message.channel.send('```Stop right there, you criminal scum!```');
      audioPlayer.pause();
    }
  } else if (command === 'resume') {
    if (voiceConnection && audioPlayer.state.status === AudioPlayerStatus.Paused) {
      message.channel.send('```Resuming playback.```');
      audioPlayer.unpause();
    }
  } else if (command === 'skipall') {
    if (voiceConnection && playing) {
      message.channel.send('```They see me skippin\', they hatin\'~```');
      queue = [];
      loop = false;
      audioPlayer.stop();
    }
  } else if (command === 'leave') {
    if (voiceConnection) {
      message.channel.send('```Bye bye!```');
      queue = [];
      loop = false;
      voiceConnection.destroy();
      voiceConnection = null;
    }
  } else if (command === 'queue') {
    let response = '';
    queue.forEach((song, index) => {
      response += `${index + 1}) ${song.title}\n`;
    });
    if (response === '') response = 'No songs in queue.';
    message.channel.send(`\`\`\`${response}\`\`\``);
  } else if (command === 'remove') {
    const number = parseInt(args[0]);
    if (number && number <= queue.length && number > 0) {
      const removed = queue.splice(number - 1, 1);
      message.channel.send(`\`\`\`Removed from queue:\n${removed[0].title}\`\`\``);
    }
  } else if (command === 'loop') {
    loop = !loop;
    if (loop) {
      message.channel.send(`\`\`\`Looping:\n${currentSong.title}\`\`\``);
    } else {
      message.channel.send('```Looping has been disabled.```');
    }
  }
});

async function search(query, message) {
  let info;
  try {
    if (ytdl.validateURL(query)) {
      info = await ytdl.getInfo(query);
    } else {
      const searchResults = await ytSearch(query);
      info = await ytdl.getInfo(searchResults.videos[0].url);
    }
  } catch (e) {
    console.error(e);
    message.channel.send('```Error occurred while searching.```');
    return;
  }
  const song = { url: info.videoDetails.video_url, title: info.videoDetails.title };
  queue.push(song);
  message.channel.send(`\`\`\`Queued up:\n${song.title}\`\`\``);
}

async function playMusic(message) {
  if (queue.length > 0 || loop) {
    playing = true;
    if (!loop) {
      currentSong = queue[0];
      queue.shift();
      message.channel.send(`\`\`\`Now playing:\n${currentSong.title}\`\`\``);
    }
    const stream = ytdl(currentSong.url, { filter: 'audioonly' });
    const resource = createAudioResource(stream);
    audioPlayer.play(resource);

    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      if (!loop) {
        playMusic(message);
      } else {
        playMusic(message);
      }
    });
  } else if (queue.length === 0) {
    playing = false;
  }
}

client.login(token);
