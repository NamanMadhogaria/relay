// Dedicated to one recording. The owner terminates this worker on stop/cancel.
setInterval(() => self.postMessage('frame'), 1000 / 30);
