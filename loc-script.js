#!/usr/bin/env node
const path = require('path')
const fs = require("fs");
const args = require("minimist")(process.argv.slice(2),{
	boolean: ["help", "exc", "he_IL", "sourceIsJson", "targetIsJson"],
	string: ["source", "target", "targetPrefix", "sourcePrefix"]
});

if (args.help) {
  printHelp();
  process.exit()
}

const SOURCE_DIR = args.source || 
  "";
const TARGET_DIR = args.target ||
  "";
const SOURCE_PREFIX = args.sourcePrefix || 'messages'
const TARGET_PREFIX = args.targetPrefix || 'messages'
const SOURCE_IS_JSON = args.sourceIsJson
const TARGET_IS_JSON = args.targetIsJson


if ((!SOURCE_DIR || !TARGET_DIR)) {
  error(new Error("source and target are required"), true)
  process.exit()
}

const OMIT_LIST = []
const INCLUDE_LIST = ['cancelPolicy.updateSuccessful', 'cancelPolicy.createSuccessful']

let fileCount = 0

updateLoc();

function printHelp() {
  console.log('loc-script usage:');
  console.log(`

      --help                              print this help.
      
      --he_IL                             use this flag when target is iw_IL but source is he_IL.
      
      --source={string}                   absolute path of source directory.
                                          you can also edit "SOURCE_DIR" in the script instead.
      
      --target={string}                   absolute path of target directory.
                                          you can also edit "TARGET_DIR" in the script instead.
      
      --targetPrefix={string}             the source file names and target file names need to be the same for this script to work. 
                                          if a source file name is "messages_zh_TW.properties", but the target file name is "feehub_zh_TW.properties", use --targetPrefix=feehub to tell the script about it.
                                          default is "messages".

      --sourcePrefix={string}             default is "messages".
      
      --sourceIsJson                      if source files are .json instead of .properties

      --targetIsJson                      if target files are .json instead of .properties

      How to omit some keys?
        Add the keys to the OMIT_LIST array.
      
      How to only include specific keys?
        Add the keys to the INCLUDE_LIST array. INCLUDE_LIST array takes precedence over OMIT_LIST.
  `);
}

function updateLoc() {
  fs.readdir(SOURCE_DIR, function (err, sourceFiles) {
    if (err) return console.error("Unable to scan directory: " + err);

    // const writeTasks = []
    sourceFiles.forEach(function (file) {
      if (file === ".DS_Store") return;
      if (file.includes("en_US")) return;

      if (!file.includes(SOURCE_PREFIX)) return
      
      const lang = file.replace("messages_", "").replace(".properties", "").replace(SOURCE_PREFIX, "");
      
      fs.readFile(path.resolve(SOURCE_DIR, file), "utf8", function (err, sourceData) {
        if (err) return console.error("Unable to read file", path.resolve(SOURCE_DIR, file));

        // console.log('sourceData', sourceData);
        
        const SOURCE_LOC_STRING_MAP = sourceData
          .split(/\r?\n/)
          .reduce((accu, sourceLine) => {
            const idx = sourceLine.indexOf("=");
            if (idx < 1) return accu;
            const sourceKey = sourceLine.slice(0, idx);
            const sourceVal = sourceLine.slice(idx+1);

            if (INCLUDE_LIST.length > 0) {
              if (INCLUDE_LIST.find(text => sourceKey.toLowerCase() === text.toLowerCase())) {
                accu[sourceKey] = sourceVal;
                return accu;
              } else {
                return accu;
              }
            } else {
              // if (OMIT_LIST.find(text => sourceKey.toLowerCase() === text.toLowerCase())) return accu
              if (OMIT_LIST.find(text => sourceKey.toLowerCase().includes(text.toLowerCase()))) return accu
            }

            accu[sourceKey] = sourceVal;
            return accu;
          }, {});
        
        // TODO: move this to error handling
        if (args.he_IL) {
          file = file.replace("he_IL", "iw_IL")
        }

        file = file.replace(SOURCE_PREFIX, TARGET_PREFIX)

        const TARGET_FILE = TARGET_IS_JSON ? file.replace('.properties', '.json') : file

        fs.readFile(path.resolve(TARGET_DIR, TARGET_FILE), "utf8", function (err, targetData) {
          if (err) {
            console.error("Unable to read file", path.resolve(TARGET_DIR, TARGET_FILE));
            return;
          }

          fileCount++

          let updateCount = 0, addCount = 0;

          console.log(fileCount);

          updateJSON(targetData, SOURCE_LOC_STRING_MAP, TARGET_DIR + '/' + TARGET_FILE)
          // const writeStream = fs.createWriteStream(path.resolve(TARGET_DIR, TARGET_FILE), {
          //   flags: "w",
          // });

          // const targetLines = targetData.split(/\r?\n/)
          // targetLines.forEach((line, lineNum) => {
          //   // remove extra blank lines
          //   if ((line === '') && (lineNum+1 < targetLines.length) && targetLines[lineNum+1] === '') return

          //   if (lineNum === targetLines.length - 1 && line === '') return
            
          //   const idx = line.indexOf("=");
            
          //   // preserve comment string
          //   if (idx < 1) {
          //     writeStream.write(line + "\n");
          //     return;
          //   }
            
          //   const targetKey = line.slice(0, idx);
          //   // remove unchanged string from SOURCE_LOC_STRING_MAP
          //   if (SOURCE_LOC_STRING_MAP[targetKey] && SOURCE_LOC_STRING_MAP[targetKey] === line) {
          //     delete SOURCE_LOC_STRING_MAP[targetKey];
          //   }
          //   if (SOURCE_LOC_STRING_MAP[targetKey]) {
          //     // update old string with new string
          //     updateCount++;
          //     writeStream.write(SOURCE_LOC_STRING_MAP[targetKey] + "\n");
          //     delete SOURCE_LOC_STRING_MAP[targetKey];
          //   } else {
          //     // console.log('line', line);
          //     // preserve old string
          //     writeStream.write(line + "\n");
          //   }
          // });

          // // add new strings that did not exist in old file
          // Object.keys(SOURCE_LOC_STRING_MAP).forEach((key) => {
          //   addCount++
          //   writeStream.write(SOURCE_LOC_STRING_MAP[key] + "\n");
          // });
          
          // console.log("\n\n%i strings added for %s", addCount, lang);
          // console.log("%i strings updated for %s", updateCount, lang);
          // writeStream.end();
          // console.log('\n\n%i files processed in total\n\n', fileCount);
        });
      });
    });
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

function updateJSON(targetContent, srcObject, targetPath) {
  const targetObject = JSON.parse(targetContent)

  const writeStream = fs.createWriteStream(path.resolve(targetPath), {
    flags: "w",
  });

  Object.entries(targetObject).forEach(pair => {
    // console.log(pair[0], pair[1]);
    const key = pair[0]
    const value = pair[1]

    const srcValue = srcObject[key]
    
    if (!srcValue) return

    // remove unchanged string from SOURCE_LOC_STRING_MAP
    if (srcValue === value) {
      delete srcObject[key];
    }
    // update old string with new string
    if (srcValue !== value) {
      targetObject[key] = srcValue
      delete srcObject[key];
    }
  })

  const updated = {
    ...targetObject,
    ...srcObject
  }

  writeStream.write(JSON.stringify(updated, null, 2));
  
  console.log("\n\n", targetPath, 'updated');

  writeStream.end();
}
