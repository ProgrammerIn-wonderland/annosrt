import { parseString } from "xml2js";
import { stringifySync } from 'subtitle';
import {writeFile} from "fs/promises";

async function main(id) {
    // fetch XML
    const url = `https://storage.googleapis.com/biggest_bucket/annotations/${id.substring(0,1)}/${id.substring(0, 3)}/${id}.xml.gz`;
    const data = await (await fetch(url)).text();
    console.log("fetched " + url)

    // parse XML as a promise (I hate callbacks)
    const result = await new Promise((resolve, reject) => {
        parseString(data, function (err, result) {
            if (err)
                return reject();
            resolve(result);
        });
    })

    // Parse the XML into subtitle nodes
    const nodes = []
    for (const annotation of result.document.annotations[0].annotation) {
        const text = annotation.TEXT[0];
        const region = annotation.segment[0].movingRegion[0];

        const timeStartSplit = region.rectRegion[0].$.t.split(/\.|:/); // will order in [min, sec, ms]
        const timeEndSplit = region.rectRegion[1].$.t.split(/\.|\:/);

        const timeStartMili = parseInt(timeStartSplit[2]) + (1000 * parseInt(timeStartSplit[1])) + (60000 * parseInt(timeStartSplit[0])); // combine to form ms
        const timeEndMili = parseInt(timeEndSplit[2]) + (1000 * parseInt(timeEndSplit[1])) + (60000 * parseInt(timeEndSplit[0]));

        // add to srt nodes
        nodes.push({
            type: "cue",
            data: {
                text: text,
                start: timeStartMili,
                end: timeEndMili
            }
        });
    }

    // Sort by time start
    nodes.sort((a,b) => a.data.start - b.data.start);

    // write result
    await writeFile(id + ".srt", stringifySync(nodes, { format: 'SRT' }));
    console.log("wrote file to " + id + ".srt")

}
main(process.argv[2]);
