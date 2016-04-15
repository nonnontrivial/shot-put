'use strict';
const fs = require('fs');
const path = require('path');
const untildify = require('untildify');
const pathExists = require('path-exists');

let moved = [];

exports.watch = (ext, dir, opts) => {

  dir = untildify(dir);
  opts = opts || {};
  const preserve = opts.preserve || [];

  const userHome = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
  const desktop = userHome + `${path.sep}desktop`;
  const dest = path.resolve(dir.split(path.sep).slice(0, 3).join(path.sep)) === userHome ? dir : path.join(userHome, dir);

  pathExists(dest)
    .then(exists => {
      if (!exists) {
        process.stderr.write(`${dir} is not a valid directory\n`);
        process.exit(0);
      }

      process.stdout.write(`\nwatching ${path.sep}desktop for new ${ext} files..\n`);
      process.nextTick(() => {

        // ..
        moveExisting(() => {

          fs.watch(desktop, (e, file) => {
            if ((e === 'rename') && (path.extname(file) === ext)) {
              moveFile(file);
            }
          })
        })
      })
    })

  function moveFile(filename, oldPath, newPath) {
    if (preserve.indexOf(filename) > -1) return null;

    oldPath = oldPath || path.normalize(desktop + `${path.sep + filename}`);
    newPath = newPath || path.normalize(dest + `${path.sep + filename.replace(/\s/g, '_')}`);

    fs.readFile(oldPath, (err, fileData) => {
      if (err) return new Error(err);

      fs.appendFile(newPath, fileData, (err) => {
        if (err) return new Error(err);

        process.stdout.write(`..moving ${filename}\n`);
        moved.push(filename);
        fs.unlink(oldPath, (err) => {})
      })
    })
  }

  function moveExisting(cb) {
    fs.readdir(desktop, (err, files) => {
      if (err) return new Error(err);

      files
        .filter(file => path.extname(file) === ext)
        .forEach(f => moveFile(f))

      cb();
    })
  }
}

exports.movedFiles = moved;

exports.revert = () => {
  if (!moved.length) return null;

  // ..
  moved.forEach(file => {
    const postMove = path.normalize(dest + `${path.sep + file.replace(/\s/g, '_')}`);
    const preMove = path.normalize(desktop + `${path.sep + file}`);

    return moveFile(file, postMove, preMove);
  })
}
