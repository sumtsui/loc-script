#!/usr/bin/env node
const path = require('path')
const fs = require("fs");
const args = require("minimist")(process.argv.slice(2),{
	boolean: ["help", "exc", "he_IL"],
	string: ["source", "target", "target-prefix"]
});

if (args.help) {
  printHelp();
  process.exit()
}

const sourceDir = args.source || 
  "";
const targetDir = args.target ||
  "";

if ((!sourceDir || !targetDir)) {
  error(new Error("source and target are required"), true)
  process.exit()
}

const OMIT_LIST = []
const INCLUDE_LIST = []

updateLoc();

function printHelp() {
  console.log('loc-script usage:');
  console.log(`

      --help                              print this help.
      
      --he_IL                             use this flag when target is iw_IL but source is he_IL.
      
      --source={string}                   absolute path of source directory.
                                          you can also edit "sourceDir" in the script instead.
      
      --target={string}                   absolute path of target directory.
                                          you can also edit "targetDir" in the script instead.
      
      --target-prefix={string}            the source file names and target file names need to be the same for this script to work. 
                                          if a source file name is "messages_zh_TW.properties", but the target file name is "feehub_zh_TW.properties", use --target-prefix=feehub to tell the script about it.
                                          default is "messages".

      How to omit some keys?
        Add the keys to the OMIT_LIST array.
      
      How to only include specific keys?
        Add the keys to the INCLUDE_LIST array. INCLUDE_LIST array takes precedence over OMIT_LIST.
  `);
}

function updateLoc() {
  // let fileCount = 0
  fs.readdir(sourceDir, function (err, sourceFiles) {
    if (err) return console.error("Unable to scan directory: " + err);

    // const writeTasks = []
    sourceFiles.forEach(function (file) {
      if (file === ".DS_Store") return;
      if (file.includes("en_US")) return;
      
      const lang = file.replace("messages_", "").replace(".properties", "");
      
      fs.readFile(path.resolve(sourceDir, file), "utf8", function (err, sourceData) {
        if (err) return console.error("Unable to read file", path.resolve(sourceDir, file));
        
        const SOURCE_LOC_STRING_MAP = sourceData
        .split(/\r?\n/)
        .reduce((accu, sourceLine) => {
          const idx = sourceLine.indexOf("=");
          if (idx < 1) return accu;
          const sourceKey = sourceLine.slice(0, idx);

          if (INCLUDE_LIST.length > 0) {
            if (INCLUDE_LIST.find(text => sourceKey.toLowerCase() === text.toLowerCase())) {
              accu[sourceKey] = sourceLine;
              return accu;
            } else {
              return accu;
            }
          } else {
            // if (OMIT_LIST.find(text => sourceKey.toLowerCase() === text.toLowerCase())) return accu
            if (OMIT_LIST.find(text => sourceKey.toLowerCase().includes(text.toLowerCase()))) return accu
          }

          accu[sourceKey] = sourceLine;
          return accu;
        }, {});
        
        // TODO: move this to error handling
        if (args.he_IL) {
          file = file.replace("he_IL", "iw_IL")
        }

        if (args["target-prefix"]) {
          file = file.replace("messages", args["target-prefix"])
        }

        fs.readFile(path.resolve(targetDir, file), "utf8", function (err, targetData) {
          if (err) {
            console.error("Unable to read file", path.resolve(targetDir, file));
            return;
          }

          // fileCount++

          let updateCount = 0, addCount = 0;
          const writeStream = fs.createWriteStream(path.resolve(targetDir, file), {
            flags: "w",
          });

          const targetLines = targetData.split(/\r?\n/)
          targetLines.forEach((line, lineNum) => {
            // remove extra blank lines
            if ((line === '') && (lineNum+1 < targetLines.length) && targetLines[lineNum+1] === '') return

            if (lineNum === targetLines.length - 1 && line === '') return
            
            const idx = line.indexOf("=");
            
            // preserve comment string
            if (idx < 1) {
              writeStream.write(line + "\n");
              return;
            }
            
            const targetKey = line.slice(0, idx);
            // remove unchanged string from SOURCE_LOC_STRING_MAP
            if (SOURCE_LOC_STRING_MAP[targetKey] && SOURCE_LOC_STRING_MAP[targetKey] === line) {
              delete SOURCE_LOC_STRING_MAP[targetKey];
            }
            if (SOURCE_LOC_STRING_MAP[targetKey]) {
              // update old string with new string
              updateCount++;
              writeStream.write(SOURCE_LOC_STRING_MAP[targetKey] + "\n");
              delete SOURCE_LOC_STRING_MAP[targetKey];
            } else {
              // console.log('line', line);
              // preserve old string
              writeStream.write(line + "\n");
            }
          });

          // add new strings that did not exist in old file
          Object.keys(SOURCE_LOC_STRING_MAP).forEach((key) => {
            addCount++
            writeStream.write(SOURCE_LOC_STRING_MAP[key] + "\n");
          });
          
          console.log("\n\n%i strings added for %s", addCount, lang);
          console.log("%i strings updated for %s", updateCount, lang);
          writeStream.end();
        });
      });
    });
    // console.log('\n\n%i files processed in total\n\n', fileCount);
  });

}

function error(err,showHelp = false) {
	process.exitCode = 1;
	console.error(err);
	if (showHelp) {
		console.log("");
		printHelp();
  }
}

function streamComplete(stream){
	return new Promise(function c(res){
		stream.on("end",res);
	});
}


