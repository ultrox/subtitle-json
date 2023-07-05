const fs = require('fs');
const path = require('path');

const SRT_STATE_SUBNUMBER = 0;
const SRT_STATE_TIME = 1;
const SRT_STATE_TEXT = 2;
const SRT_STATE_BLANK = 3;

let all_timecodes = [];

let output = {
    id: "33834784375375",
    title: "The Shawshank Redemption",
    format: "SubRip",
    templates: {
        default: '__CONTENT__',
        italic: '<i>__CONTENT__</i>'
    },
    styles: {
        default: 'font-style: 10px; line-height: 1; color: #FFF;'
    },
    data: []
};

function to_ms(duration) {
    let p = duration.split(':');
    if (p.length && p[1] && p[2] && p[3]) {
        return parseInt(p[0]) * 3600000 + parseInt(p[1]) * 60000 + parseInt(p[2]) * 1000 + parseInt(p[3]);
    }
    return 0;
}

function parse_srt_file_to_data(lang = 'en') {
    let state = SRT_STATE_SUBNUMBER;
    let subNum = 0;
    let subText = '';
    let subTime = '';

    let lines = fs.readFileSync(path.join(__dirname, `../srt/shawshank_${lang}.srt`)).toString().split('\n');

    let subs = [];
    let current = 0;
    let max = 50000;

    for (let line of lines) {
        if (current <= max) {
            switch (state) {
                case SRT_STATE_SUBNUMBER:
                    subNum = line.trim();
                    state = SRT_STATE_TIME;
                    break;

                case SRT_STATE_TIME:
                    subTime = line.trim();
                    state = SRT_STATE_TEXT;
                    break;

                case SRT_STATE_TEXT:
                    if (line.trim() === '') {
                        let sub = {};

                        let timeSplit = subTime.split(' --> ');
                        sub.startTime = timeSplit[0];
                        sub.stopTime = timeSplit[1];

                        let start_time = to_ms(sub.startTime.replace(',', ':'));
                        let end_time = to_ms(sub.stopTime.replace(',', ':'));

                        if (!all_timecodes[start_time]) {
                            all_timecodes[start_time] = [];
                        }

                        let start_div = sub.startTime.split(',');
                        let start_parts = start_div[0].split(':');

                        sub.start = {
                            time: parseFloat(start_time),
                            hour: parseFloat(start_parts[0]),
                            mins: parseFloat(start_parts[1]),
                            secs: parseFloat(start_parts[2]),
                            ms: parseFloat(start_div[1]),
                        };

                        let end_div = sub.stopTime.split(',');
                        let end_parts = end_div[0].split(':');

                        sub.end = {
                            time: parseFloat(end_time),
                            hour: parseFloat(end_parts[0]),
                            mins: parseFloat(end_parts[1]),
                            secs: parseFloat(end_parts[2]),
                            ms: parseFloat(end_div[1]),
                        };

                        sub.duration = parseFloat(end_time - start_time);

                        let lang_content = line.trim().replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, " ").replace(/<[^>]*>?/gm, '');
                        sub.content = lang_content;

                        sub.meta = {
                            original: {
                                start: sub.startTime,
                                end: sub.stopTime
                            }
                        };

                        sub.align = 'center';

                        delete sub.startTime;
                        delete sub.stopTime;

                        subs[start_time] = sub;

                        if (lang_content) {
                            all_timecodes[start_time] = {
                                trigger: start_time,
                                lang: lang,
                                styles: ['default'],
                                templates: subText.includes('<i>') ? ['italic'] : ['default'],
                                start: sub.start,
                                end: sub.end,
                                duration: {
                                    secs: parseFloat((sub.duration / 1000).toFixed(4)),
                                    ms: sub.duration
                                },
                                content: sub.content,
                                meta: sub.meta
                            };
                        }

                        subText = '';
                        state = SRT_STATE_SUBNUMBER;

                        current++;
                    } else {
                        subText += line;
                    }
                    break;
            }
        }
    }

    return subs;
}

let en_subs = parse_srt_file_to_data('en');
let fr_subs = parse_srt_file_to_data('fr');
let es_subs = parse_srt_file_to_data('es');
let pt_subs = parse_srt_file_to_data('pt');
let it_subs = parse_srt_file_to_data('it');

let sortedKeys = Object.keys(all_timecodes).sort((a, b) => a - b);
let finalized = sortedKeys.map(key => all_timecodes[key]).filter(data => Object.keys(data).length);

output.data = finalized;

fs.writeFileSync(path.join(__dirname, '../json/multi-language/PRETTY_multi_the_shawshank_redemption.json'), JSON.stringify(output, null, 2));
fs.writeFileSync(path.join(__dirname, '../json/multi-language/RAW_multi_the_shawshank_redemption.json'), JSON.stringify(output));

console.log('done');