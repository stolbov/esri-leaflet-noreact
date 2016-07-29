var attachApiURL = '/attach_api/attachs/';

var editBtn = document.getElementById('editor');
var editorPanel = document.getElementById('editorPanel');
var createBtn = document.getElementById('create');
var deleteBtn = document.getElementById('delete');
var consolePanel = document.getElementById('console');
var fullScreenPanel = document.getElementById('fullScreenPanel');
var fullScreenContent = document.getElementById('fullScreenContent');
var userPanel = document.getElementById('userPanel');

// var _service = {
//   url: 'https://chebtelekom.ru/arcgis/rest/services/dorogi/kap_rem_dor_2015/FeatureServer/0',
//   fields: [
//     {
//       name: 'наименование',
//       title: 'Наименование',
//       translit: 'featureName'
//     }, {
//       name: 'объем_кв_м_',
//       title: 'Объем (кв.м.)',
//       translit: 'featureOb'
//     }, {
//       name: 'протяженность_п_м',
//       title: 'Протяженность (п.м.)',
//       translit: 'featureProt'
//     }, {
//       name: 'район',
//       title: 'Район',
//       translit: 'featureRay'
//     }, {
//       name: 'исполнитель',
//       title: 'Исполнитель',
//       translit: 'featureIsp'
//     }
//   ]
// };
var _service = {
  url: 'http://gisweb.chebtelekom.ru/arcgis/rest/services/tek/tek_2015_features/FeatureServer/0',
  fields: [
    {
      name: 'mkr_name',
      title: 'Наименование',
      translit: 'featureName'
    }, {
      name: 'ploshad_zastroiki',
      title: 'Площадь застройки (кв.м.)',
      translit: 'featureOb'
    }, {
      name: 'fakt_pl',
      title: 'Фактич. площадь застройки (кв.м.)',
      translit: 'featureRay'
    }, {
      name: 'territory',
      title: 'Площадь территори (га.)',
      translit: 'featureProt'
    }
  ]
};
var _STORE = {};

var showPanel = function (content) {
  if (!content || content == "") {
    consolePanel.style.display = "none";
    consolePanel.innerHTML = "";
  } else {
    consolePanel.style.display = "block";
    consolePanel.innerHTML = content;
  }
};

var showFullScreen = function (content) {
  if (!content || content == "") {
    fullScreenPanel.style.display = "none";
    fullScreenContent.innerHTML = "";
  } else {
    fullScreenPanel.style.display = "block";
    fullScreenContent.innerHTML = content;
  }
}

var getAttachesById = function (featureId, callback) {
  superagent.get(attachApiURL + featureId)
    .end(function (err, res) {
      var text = 'Без вложений';
      if (!err) {
        var attachs = JSON.parse(res.text);
        if (attachs.length) {
          text = '';
          attachs.forEach(function (attach) {
            text += '<div class="attachLink" data-id="' + attach._id +'">' +
                      '<a href="' +  attach.fileName +'" target="_blank" >' +
                          '<div class="attachImgWr" style="background-image: url(' + attach.fileName + ')"></div>'+
                          '<div class="attachImgTitle">' + attach.fileName + '</div>' +
                      // '<img src="' +  attach.fileName +'" />' +
                      '</a>' +
                      // '<a href="' +  attach.fileName +'" target="_blank" >' +  attach.fileName +'</a>' +
                    '</div>';
          });
        }
      }
      callback(text);
    })
  ;

};

var popuper = function () {
  if (!_STORE.isEditable) {
    featureLayer.bindPopup(function (evt) {
      var text = '<h3>Сведения об объекте</h3>';
      var shortText = '';
      _service.fields.forEach(function (field, iter) {
        text += '<p><b>' + field.title + ': </b> ' + evt.feature.properties[field.name] + '</p>';
        if (!iter) {
          shortText += evt.feature.properties[field.name];
        }
      });
      var tpl = L.Util.template(
        shortText,
        evt.feature.properties
      );
      showPanel(text + '<!--<div class="btn" id="saveFeatureData">Редактровать</div>--><hr><h3>Вложения</h3><div id="attach"></div>');
      getAttachesById(evt.feature.id, function (text) {
        document.getElementById('attach').innerHTML = text;
      });
      // document.getElementById('saveFeatureData').onclick = function () {
      //   evt.enableEdit();
      //   _STORE.currentPolygon = evt;
      //   _STORE.isEditable = true;
      //   editBtn.click();
      //   map.closePopup();
      // }
      return tpl;
    });
  } else {
    featureLayer.unbindPopup();
    map.closePopup();
  }
};

var showUserPanel = function (userData) {
  if (userData) {
    userPanel.style.display = 'block';
    userPanel.innerHTML = 'Пользователь: ' + userData.displayName + '<div class="btn" id="userLogout">Выйти</div>';
    document.getElementById('userLogout').onclick = function () {
      superagent.get('/api/logout')
        .end(function (err, res) {
          userPanel.innerHTML = '';
          userPanel.style.display = 'none';
          checkAuth();
        })
      ;
    }
  } else {
    userPanel.style.display = 'none';
    userPanel.innerHTML = '';
  }

};

var getAuthForm = function (errText) {
  var HTML = errText ?
    '<p><b>' + errText + '</b></p>' :
    ''
  ;
  HTML += '\
    <div>Логин:</div>\
    <input type="text" id="userLogin" />\
    <div>Пароль:</div>\
    <input type="password" id="userPassw" /><br><br>\
    <div class="btn" id="userLoginAction">Войти</div>\
  ';

  showFullScreen(HTML);

  document.getElementById('userLoginAction').onclick = function () {
    superagent.post('/api/login')
      .send({
        name: document.getElementById('userLogin').value,
        password: CryptoJS.MD5(document.getElementById('userPassw').value).toString()
      })
      .end(function (err, res) {
        // console.log(err, res);
        if (err || res.text == "Not Found") {
          getAuthForm("Ошибка авторизаци");
        } else {
          var userData = JSON.parse(res.text);
          showFullScreen();
          showUserPanel(userData);
        }
      })
    ;
  }
};

var checkAuth = function () {
  superagent.get('/api/user')
    .end(function (err, res) {
      if (res.forbidden) {
        getAuthForm();
        showUserPanel();
      } else {
        showUserPanel(JSON.parse(res.text));
      }
    })
  ;
};

var drawDeletableAttachs = function (featureId) {
  getAttachesById(featureId, function (text) {
    document.getElementById('attach').innerHTML = text;
    var attachNodes = document.getElementsByClassName('attachLink');
    Object.keys(attachNodes).forEach(function (el) {
        var btn = document.createElement('div');
        btn.className = 'btn';
        btn.innerHTML = "Удалить";
        attachNodes[el].appendChild(btn);
        btn.onclick = function () {
          superagent.post(attachApiURL + 'delete/' + attachNodes[el].getAttribute('data-id'))
            .end(function (err, res) {
              drawDeletableAttachs(featureId);
            })
          ;
        }
    });
  });
};

_STORE.layers = [];
_STORE.isEditable = false;
_STORE.isCreatable = false;
_STORE.currentPolygon = false;
_STORE.editedFeatures = {};
_STORE.currentStyles = {};
showPanel();
showFullScreen();
checkAuth();

var map = L.map('map', {editable: true}).setView([56.140763, 47.237491], 13);

var tilelayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// L.esri.featureLayer({
//   url: 'http://10.2.0.20/arcgis/rest/services/OKS/oks_culture/FeatureServer/0',
// }).addTo(map);

var featureLayer = L.esri.featureLayer({
  url: _service.url,
  // simplifyFactor: 1
}).addTo(map);

popuper();

editBtn.onclick = function () {
  if (!_STORE.isEditable) {
    editBtn.className = 'panelBtn active';
    _STORE.layers.forEach(function (feature) {
      feature.on('click', L.DomEvent.stop).on('click', feature.toggleEdit);
    });
    editorPanel.style.display = "block";
  } else {
    editBtn.className = 'panelBtn';
    _STORE.layers.forEach(function (feature) {
      feature.off('click', L.DomEvent.stop).off('click', feature.toggleEdit);
    });
    if (_STORE.currentPolygon) {
      _STORE.currentPolygon.disableEdit();
    }
    editorPanel.style.display = "none";
  }
  _STORE.isEditable = !_STORE.isEditable;
  popuper();
};

createBtn.onclick = function () {
  if (!_STORE.isCreatable) {
    createBtn.className = 'panelBtn active';
    _STORE.isCreatable = true;
    map.editTools.startPolygon();
  } else {
    createBtn.className = 'panelBtn';
    _STORE.isCreatable = false;
    map.editTools.stopDrawing();
  }
};

deleteBtn.onclick = function () {
  if (!_STORE.isDeletable) {
    deleteBtn.className = 'panelBtn active';
    _STORE.isDeletable = true;
  } else {
    deleteBtn.className = 'panelBtn';
    _STORE.isDeletable = false;
  }
};

featureLayer.on('click', function (e) {
  var feature = e.layer.toGeoJSON();
  if (_STORE.isDeletable) {
    featureLayer.deleteFeature(
      feature.id,
      function (err, res) {
        // console.log(err);
        // console.log(res);
      }
    );
    return true;
  }

  if (_STORE.isEditable && _STORE.currentPolygon) {
    var text = '';
    _service.fields.forEach(function (field, iter) {
      text += field.title + ':<br /><input type="text" id="'+ field.translit + '" value="' +
        (feature.properties[field.name] ? feature.properties[field.name] : "") +
      '"/><br />'
    });
    showPanel(text + '<br><div class="btn" id="saveFeatureData">Сохранить</div><hr><h3>Вложения</h3><div id="attachFormWr"></div><div id="attach"></div>');

    var form = '<form name="attachForm" id="attachForm">' +
                  '<input type="file" name="attachField" multiple id="attachField"/>' +
                  '<div id="uploadAttach" class="btn">Добавить вложение</div>' +
                '</form>';
    document.getElementById('attachFormWr').innerHTML = form;

    drawDeletableAttachs(feature.id);

    document.getElementById('uploadAttach').onclick = function () {
      var files = document.getElementById('attachField').files;
      var req = superagent.post(attachApiURL + 'upload/' + feature.id);
      Object.keys(files).forEach(function (key) {
         req.attach(files[key].name, files[key]);
      });
      req.end(function (err, res) {
        drawDeletableAttachs(feature.id);
      });
    }

    document.getElementById('saveFeatureData').onclick = function () {
      var newFeature = _STORE.currentPolygon.toGeoJSON();
      _service.fields.forEach(function (field, iter) {
        newFeature.properties[field.name] = document.getElementById(field.translit).value;
      });
      showPanel('<i>Обновление данных...</i>');
      featureLayer.updateFeature(
        newFeature,
        function (err, res) {
          if (err || !res.success) {
            showPanel('<b>Ошибка сохранения.</b>');
          } else {
            showPanel('<b>Успешно!</b>');
          }
        }
      );
    }
  }
});

map.on('layeradd', function (e) {
  if (e.layer instanceof L.Polygon) {
    _STORE.layers.push(e.layer);
    // e.layer.on('click', L.DomEvent.stop).on('click', e.layer.toggleEdit);
  }
});
// map.on('layerremove', function (e) {
//   if (e.layer instanceof L.Polygon) {
//     // e.layer.off('click', L.DomEvent.stop).off('click', e.layer.toggleEdit);
//   }
// });
map.on('popupclose', function (e) {
  showPanel();
});
map.editTools.on('editable:enable', function (e) {
  if (_STORE.currentPolygon) _STORE.currentPolygon.disableEdit();
  _STORE.currentPolygon = e.layer;
  this.fire('editable:enabled');
});
map.editTools.on('editable:disable', function (e) {
  _STORE.currentPolygon = false;
  showPanel();
});
map.editTools.on('editable:drawing:end', function (e) {
  if (_STORE.currentPolygon._parts && _STORE.currentPolygon._parts.length) {
    var newFeature = _STORE.currentPolygon.toGeoJSON();
    newFeature.properties["исполнитель"] = "АО «Дорэкс» (ООО «СК «Гарант»)";
    newFeature.properties["наименование"] =  "simple test street";
    newFeature.properties["объем_кв_м_"] =  "18440";
    newFeature.properties["район"] =  "Московский";

    featureLayer.addFeature(
      newFeature,
      function (err, res) {
        console.log(err);
        console.log(res);
      }
    );

    _STORE.currentPolygon.disableEdit();
    _STORE.layers.forEach(function (feature) {
      if (!feature.feature) {
        map.removeLayer(feature);
        console.log(map.hasLayer(feature));
        console.log(feature.toGeoJSON());
      }
    });
    _STORE.currentPolygon = false;
    console.log('editable:drawing:end');
  }
  if (_STORE.isCreatable) {
    map.editTools.startPolygon();
  }
});
