'use babel';

import WipAtomView from './wip-atom-view';
import {
  CompositeDisposable
} from 'atom';

const request = require('request')
const fs = require('fs');

var validateFilesToDownload = function(files) {
  for (file in files) {
    if (file.indexOf('.json') != -1) {

    } else if (file.indexOf('.css') != -1) {

    } else if (file.indexOf('.html') != -1) {

    } else if (file.indexOf('.js') != -1) {

    } else {
      delete files[file];
    }
  }
  return files;
}

var uploadFiles = function(fileList) {
  var filepath = atom.project.getPaths()[0] + '/wipconfig.json'
  var content = fs.readFileSync(filepath, 'utf8')
  var config = JSON.parse(content)
  var username = config.username;
  var password = config.password;
  var group = config.group;
  var app = config.app;

  atom.notifications.addInfo("Filerna sparas", null)


  for (file in fileList) {
    filepath = atom.project.getPaths()[0] + '/' + file;
    var urlString = "https://dynappbeta.wip.se/dynapp-server/rest/groups/" + group + "/apps/" + app + "/data-items/" + file
    var headers;

    if (file.indexOf('.json') != -1) {
      headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
    } else if (file.indexOf('.css') != -1) {
      headers = {
        'Content-Type': 'text/css',
        'Accept': 'application/json'
      };
    } else if (file.indexOf('.html') != -1) {
      headers = {
        'Content-Type': 'text/html',
        'Accept': 'application/json'
      };
    } else if (file.indexOf('.js') != -1) {
      headers = {
        'Content-Type': 'text/javascript',
        'Accept': 'application/json'
      };
    } else {
      continue;
    }

    var content = fs.readFileSync(filepath, 'utf8')
    var options = {
      url: urlString,
      method: 'PUT',
      headers: headers,
      body: content,
      auth: {
        'user': username,
        'pass': password
      }
    };

    function callback(error, response, body) {
      if(response.statusCode != 204){
        atom.notifications.addWarning("Kunde inte spara data. Kolla dina uppgifter i wipconfig.json", null)

      }
    }
    request(options, callback);
  }
  setTimeout(function() {
    getFileList().then(function(result) {
      var filepath = atom.project.getPaths()[0]
      fs.writeFile(filepath + '/.files.json', JSON.stringify(result, null, 4));
    });
  }, 500, 'saveFile');
}

var downloadFile = function(file) {
  var filepath = atom.project.getPaths()[0] + '/wipconfig.json'
  //var config = require(filepath)
  var content = fs.readFileSync(filepath, 'utf8')
  var config = JSON.parse(content)

  var username = config.username;
  var password = config.password;
  var group = config.group;
  var app = config.app;

  filepath = atom.project.getPaths()[0]

  var options = {
    url: "https://dynappbeta.wip.se/dynapp-server/rest/groups/" + group + "/apps/" + app + "/data-items/" + file,
    auth: {
      user: username,
      password: password
    }
  }

  request(options, function(err, res, body) {
    if (err) {
      console.dir(err)
      return
    }
    //console.log(res)
    if (file.indexOf('json') == -1) {
      fs.writeFile(filepath + '/' + file, body, 'binary', function(err) {});
    } else {
      var obj = JSON.parse(body)
      fs.writeFile(filepath + '/' + file, JSON.stringify(obj, null, 4));
    }
  })
}

var getFileList = function() {
  return new Promise(function(resolve, reject) {
    var filepath = atom.project.getPaths()[0] + '/wipconfig.json'
    var content = fs.readFileSync(filepath, 'utf8')
    var config = JSON.parse(content)
    var username = config.username;
    var password = config.password;
    var group = config.group;
    var app = config.app;

    var options = {
      url: "https://dynappbeta.wip.se/dynapp-server/rest/groups/" + group + "/apps/" + app + "/data-items/",
      auth: {
        user: username,
        password: password
      }
    }

    request(options, function(err, res, body) {
      if (err) {
        console.dir(err)
        return
      }

      if(res.statusCode != 200){
        atom.notifications.addWarning("Kunde inte hämta data. Kolla dina uppgifter i wipconfig.json", null)
        reject()
        return
      }
      var obj = JSON.parse(body)
      resolve(obj)
    })
  })
}

export default {

  wipAtomView: null,
  modalPanel: null,
  subscriptions: null,


  activate(state) {
    this.wipAtomView = new WipAtomView(state.wipAtomViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.wipAtomView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'wip-atom:downloadProject': () => this.download(),
      'wip-atom:createConfig': () => this.createConfig(),
      'wip-atom:uploadItems': () => this.uploadItems(),
      'wip-atom:start': () => this.start()
    }));
  },
  start() {
    console.log("start");
  },
  uploadItems() {
    console.log("HELLLO!")
    
  },
  createConfig() {
    console.log('Creating config file')
    var wipconfig = {
      "username": "<username>/<devgroup>",
      "password": "<password>",
      "group": "<projectGroup>",
      "app": "<appname>"
    }

    var filepath = atom.project.getPaths()[0]

    fs.writeFile(filepath + '/wipconfig.json', JSON.stringify(wipconfig, null, 4));

  },
  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.wipAtomView.destroy();
  },

  serialize() {
    return {
      wipAtomViewState: this.wipAtomView.serialize()
    };
  },
  // download the project
  download() {
    console.log("Downloading files")
    getFileList().then(function(result) {
      var filesToDownload = validateFilesToDownload(result)
      var filepath = atom.project.getPaths()[0]
      fs.writeFile(filepath + '/.files.json', JSON.stringify(filesToDownload, null, 4));

      for (file in filesToDownload) {
        downloadFile(file)
      }
    });
  }
};
