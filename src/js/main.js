var attachApiURL = '/api/attachs/';

var editBtn = document.getElementById('editor');
var editorPanel = document.getElementById('editorPanel');
var createBtn = document.getElementById('create');
var deleteBtn = document.getElementById('delete');
var consolePanel = document.getElementById('console');

var _service = {
  url: 'https://chebtelekom.ru/arcgis/rest/services/dorogi/kap_rem_dor_2015/FeatureServer/0',
  fields: [
    {
      name: 'наименование',
      title: 'Наименование',
      translit: 'featureName'
    }, {
      name: 'объем_кв_м_',
      title: 'Объем (кв.м.)',
      translit: 'featureOb'
    }, {
      name: 'протяженность_п_м',
      title: 'Протяженность (п.м.)',
      translit: 'featureProt'
    }, {
      name: 'район',
      title: 'Район',
      translit: 'featureRay'
    }, {
      name: 'исполнитель',
      title: 'Исполнитель',
      translit: 'featureIsp'
    }
  ]
};

var _STORE = {};

var showPanel = function (str) {
  if (!str || str == "") {
    consolePanel.style.display = "none";
    consolePanel.innerHTML = "";
  } else {
    consolePanel.style.display = "block";
    consolePanel.innerHTML = str;
  }
};

var getAttachesById = function (featureId, callback) {
  superagent.get(attachApiURL + featureId)
    .end(function (err, res) {
      var text = 'Без вложений';
      var edit = '';
      if (!err) {
        var attachs = JSON.parse(res.text);
        if (attachs.length) {
          text = '';
          attachs.forEach(function (attach) {
            text += '<div class="attachLink" data-id="' + attach._id +'">' +
                      '<a href="' +  attach.fileName +'" target="_blank" >' +
                      '<img src="' +  attach.fileName +'" />' +
                      '</a>' +
                      '<a href="' +  attach.fileName +'" target="_blank" >' +  attach.fileName +'</a>' +
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
      var text = '';
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
      showPanel(text + '<div class="btn" id="saveFeatureData">Редактровать</div><div id="attach"></div>');
      getAttachesById(evt.feature.id, function (text) {
        document.getElementById('attach').innerHTML = text;
      })
      return tpl;
    });
  } else {
    featureLayer.unbindPopup();
    map.closePopup();
  }
};

_STORE.layers = [];
_STORE.isEditable = false;
_STORE.isCreatable = false;
_STORE.currentPolygon = false;
_STORE.editedFeatures = {};
_STORE.currentStyles = {};
showPanel();

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
var drawDeletableAttachs = function (featureId) {
  getAttachesById(featureId, function (text) {
    document.getElementById('attach').innerHTML = text;
    var attachNodes = document.getElementsByClassName('attachLink');
    console.log(attachNodes);
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

featureLayer.on('click', function (e) {
  var feature = e.layer.toGeoJSON();
  console.log(feature);
  if (_STORE.isDeletable) {
    featureLayer.deleteFeature(
      feature.id,
      function (err, res) {
        console.log(err);
        console.log(res);
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
    showPanel(text + '<br><div class="btn" id="saveFeatureData">Сохранить</div><div id="attachFormWr"></div><div id="attach"></div>');

    var form = '<form name="attachForm" id="attachForm">' +
                  '<input type="file" name="attachField" multiple id="attachField"/>' +
                  '<div id="uploadAttach" class="btn">Добавить вложение</div>' +
                '</form>';
    document.getElementById('attachFormWr').innerHTML = form;

    drawDeletableAttachs(feature.id);

    document.getElementById('uploadAttach').onclick = function () {
      var files = document.getElementById('attachField').files;
      console.log(files);
      var req = superagent.post(attachApiURL + 'upload/' + feature.id);
      Object.keys(files).forEach(function (key) {
         req.attach(files[key].name, files[key]);
      });
      // req.set("Content-Type", "multipart/form-data");
      // req.set("Accept", "application/json");
      req.end(function (err, res) {
        console.log(err, res);
        drawDeletableAttachs(feature.id);
        // getAttachesById(feature.id, function (text) {
        //   document.getElementById('attach').innerHTML = text;
        //   var attachNodes = document.getElementsByClassName('attachLink');
        //   console.log(attachNodes);
        //   Object.keys(attachNodes).forEach(function (el) {
        //       var btn = document.createElement('div');
        //       btn.className = 'btn';
        //       btn.innerHTML = "Удалить";
        //       attachNodes[el].appendChild(btn);
        //       btn.onclick = function () {
        //         console.log(attachNodes[el].getAttribute('data-id'));
        //         superagent.post(attachApiURL + 'delete/' + attachNodes[el].getAttribute('data-id'))
        //           .end(function (err, res) {
        //             getAttachesById(feature.id, function (text) {
        //               document.getElementById('attach').innerHTML = text;
        //             });
        //           })
        //         ;
        //       }
        //   });
        // });
      });
    }

    // getAttachesById(feature.id, function (text) {
    //   document.getElementById('attach').innerHTML = text;
    //   var attachNodes = document.getElementsByClassName('attachLink');
    //   Object.keys(attachNodes).forEach(function (el) {
    //       var btn = document.createElement('div');
    //       btn.className = 'btn';
    //       btn.innerHTML = "Удалить";
    //       attachNodes[el].appendChild(btn);
    //       btn.onclick = function () {
    //         console.log(attachNodes[el].getAttribute('data-id'));
    //         superagent.post(attachApiURL + 'delete/' + attachNodes[el].getAttribute('data-id'))
    //           .end(function (err, res) {
    //             getAttachesById(feature.id, function (text) {
    //               document.getElementById('attach').innerHTML = text;
    //             });
    //           })
    //         ;
    //       }
    //   });
    // });

    document.getElementById('saveFeatureData').onclick = function () {
      var newFeature = _STORE.currentPolygon.toGeoJSON();
      _service.fields.forEach(function (field, iter) {
        newFeature.properties[field.name] = document.getElementById(field.translit).value;
      });
      showPanel('<i>Обновление данных...</i>');
      featureLayer.updateFeature(
        newFeature,
        function (err, res) {
          console.log(err, res);
          if (err || !res.success) {
            showPanel('<b>Ошибка сохранения.</b>');
          } else {
            showPanel('<b>Успешно!</b>');
          }
          // e.layer.toggleEdit.on('click', L.DomEvent.stop).on('click', feature.toggleEdit);
          // e.layer.fire('editable:enabled');
        }
      );
    }
  }
  // var styles = featureLayer.options.style(feature);
  // _STORE.currentStyles = styles;
  // console.log(e.layer.toGeoJSON());
  // consolePanel.innerHTML = print(styles);
});

map.on('layeradd', function (e) {
  if (e.layer instanceof L.Polygon) {
    _STORE.layers.push(e.layer);
    // e.layer.on('click', L.DomEvent.stop).on('click', e.layer.toggleEdit);
  }
});
map.on('layerremove', function (e) {
  if (e.layer instanceof L.Polygon) {
    // e.layer.off('click', L.DomEvent.stop).off('click', e.layer.toggleEdit);
  }
});
map.on('popupclose', function (e) {
  showPanel();
});
map.editTools.on('editable:enable', function (e) {
  // if (this.currentPolygon) this.currentPolygon.disableEdit();
  // this.currentPolygon = e.layer;
  // _STORE.currentPolygon = this.currentPolygon;
  // this.fire('editable:enabled');
  if (_STORE.currentPolygon) _STORE.currentPolygon.disableEdit();
  _STORE.currentPolygon = e.layer;
  this.fire('editable:enabled');
});
map.editTools.on('editable:disable', function (e) {
  // delete this.currentPolygon;
  // console.log('editable:disable ');
  // console.log(_STORE.currentPolygon.toGeoJSON());
  _STORE.currentPolygon = false;
  showPanel();
});
map.editTools.on('editable:drawing:end', function (e) {
  // consolePanel.innerHTML = print(_STORE.currentPolygon.toGeoJSON());
  if (_STORE.currentPolygon._parts && _STORE.currentPolygon._parts.length) {
    // _STORE.currentPolygon.setStyle(_STORE.currentStyles);
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
    // map.removeLayer(_STORE.layers[_STORE.layers.length].toGeoJSON());
    // console.log(_STORE.layers);
    _STORE.currentPolygon = false;
    console.log('editable:drawing:end');
  }
  if (_STORE.isCreatable) {
    map.editTools.startPolygon();
  }
});
