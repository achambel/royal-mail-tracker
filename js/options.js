const defaultSettings = {
    name: 'settings',
    value: JSON.stringify(
      {
            checkInterval: 60,
            checkUnitInterval: 'minute',
            showNotification: true
      }
    )
};

function initializeSettings() {

  chrome.storage.sync.get(null, (storage) => {

    if(!storage.hasOwnProperty(defaultSettings.name)) {
        const settings = { 'settings': defaultSettings.value };
        chrome.storage.sync.set(settings);
    }

  });
}

function loadSettings() {
  
  chrome.storage.sync.get('settings', (storage) => {

    if(storage.hasOwnProperty(defaultSettings.name)) {
      
      const settings = JSON.parse(storage.settings);
      document.getElementById('checkInterval').value = settings.checkInterval;
      document.querySelector(`#checkUnitInterval option[value=${settings.checkUnitInterval}]`).selected = true;
      document.getElementById('showNotification').checked = settings.showNotification;
    }

  });
}

function saveSettings(e) {

  e.preventDefault();

  const settings = {
      checkInterval: parseInt(document.getElementById('checkInterval').value),
      checkUnitInterval: document.getElementById('checkUnitInterval').value,
      showNotification: document.getElementById('showNotification').checked
  };

  chrome.storage.sync.set({'settings': JSON.stringify(settings)}, function() {

    $('.ui.basic.modal .header').text('Message');
    $('.ui.basic.modal .content').html('<h3>The settings have been successfully saved!</h3>');
    $('.ui.basic.modal').modal('show');

  });

}

function saveReferenceNumber(e) {
  
  e.preventDefault();
  const referenceNumberElement = document.getElementById('referenceNumber');
  const referenceNumber = referenceNumberElement.value.toUpperCase();
  const item = new Item(referenceNumber);
  saveTrackable(item);
  referenceNumberElement.value = '';

}

function renderTrackItems(items) {

  let template = `
    <table class="ui red striped table">
      <thead>
        <th>Reference Number</th>
        <th>Via</th>
        <th>Checked at</th>
        <th>Status</th>
        <th>Date</th>
        <th>Trackpoint</th>
        <th>Tracks</th>
        <th>Next checking</th>
        <th colspan="2">Actions</th>
      </thead>
      <tbody>
        {{lines}}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="10">
            <button class="ui labeled icon inverted orange button" id="checkAll">
              <i class="alarm icon"></i>
              Check all now
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
  `;

  const lines = items.map( item => {
    
    return  ` <tr data-reference-number="${item.referenceNumber}">
                <td>${item.referenceNumber}</td>
                <td>${item.via}</td>
                <td>${formatDate(item.checkedAt)}</td>
                <td><span class="ui small ${statusesClass[item.lastStatus.toUpperCase()] || 'primary'} label">${item.lastStatus}</span></td>
                <td>${item.tracks.length ? item.tracks[0].date + ' ' + item.tracks[0].time : ''}</td>
                <td>${item.tracks.length ? item.tracks[0].trackPoint : ''}</td>
                <td>
                    <button class="ui labeled icon inverted tiny green button show-track-history">
                      <i class="clock icon"></i>
                      show
                    </button>
                </td>
                <td>${formatDate(item.nextCheck)}</td>
                <td>
                  <button class="ui labeled icon inverted orange button check-now">
                    <i class="alarm icon"></i>
                    check
                  </button>
                </td>
                <td>
                  <button class="ui labeled icon inverted tiny red button remove-trackable">
                    <i class="trash icon"></i>
                    remove
                  </button>
                </td>
              </tr>
            `
  }).join('');

  if(lines) {

    template = template.replace(/{{lines}}/g, lines);
    
  }
  else {

    template = '<div class="ui info message"><p>You have no item, please add one.</p></div>';
  }

  return template;

}

function renderTrackHistory(item) {

  let template = `
    <table class="ui red striped table">
      <caption class="ui red header">Reference number: ${item.referenceNumber} - via: ${item.via}</caption>
      <thead>
        <th>Date</th>
        <th>Status</th>
        <th>Trackpoint</th>
      </thead>
      <tbody>
        {{lines}}
      </tbody>
    </table>
  `;

  const lines = item.tracks.map( track => {
    return  `<tr>
                <td>${track.date} ${track.time}</td>
                <td><span class="ui small ${statusesClass[track.status.toUpperCase()] || 'primary'} label">${track.status}</span></td>
                <td>${track.trackPoint}</td>
              </tr>
            `
  }).join('');

  if(lines) {

    template = template.replace(/{{lines}}/g, lines);
  }

  else {
    
    template = '<h3>There are no tracks!</h3>';
  }

  return template;

}

function loadTrackHistory(referenceNumber, callback) {

  getTrackItems().then( items => {
  
    const itemFiltered = items.filter(item => item.referenceNumber === referenceNumber);
  
    if(itemFiltered.length) {

      if (typeof callback === 'function') callback(renderTrackHistory(itemFiltered[0]));
    }

  });

}

function showTrackHistory(history) {
  $('.ui.basic.modal .header').text('Tracks');
  $('.ui.basic.modal .content').html(history);
  $('.ui.basic.modal').modal('show');
}

function removeTrackable(referenceNumber) {

  chrome.storage.sync.get('trackItems', storage => {

    const trackItems = JSON.parse(storage.trackItems);
    const itemIndex = trackItems.findIndex(oldItem => oldItem.referenceNumber === referenceNumber);
    
    if(itemIndex >= 0) {

      trackItems.splice(itemIndex, 1);
      const save = {'trackItems': JSON.stringify(trackItems)};
      chrome.storage.sync.set(save, loadTrackItems);    
    }
    
  })

}

document.addEventListener('DOMContentLoaded', () => {
  initializeSettings();
  loadSettings();
  loadTrackItems();
});

document.getElementById('formSaveReferenceNumber').addEventListener('submit', saveReferenceNumber);
document.getElementById('formSettings').addEventListener('submit', saveSettings);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if(request.action === 'loadTrackItems') {
    loadTrackItems();
  }

})
