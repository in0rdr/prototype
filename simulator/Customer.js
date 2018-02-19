const defaults = {
    addr: "0x",
    id: 0
}

class Customer {
    constructor(_options) {
        this.addr = _options.addr || defaults.addr;
        this.id = _options.id || defaults.id;
        this.nextMove = {};
    }

    init(_task) {
        //starting move
    }

    advance(_task, _activeTasks, _finishedTasks) {
        if (typeof this.nextMove[_task.id] === 'undefined') {
            console.log("[", _task.id, "]", this.constructor.name, "\t initalizes");
            return this.init(_task);
        } else if (this.nextMove[_task.id] === 'finish') {
            return this.finish(_task, _activeTasks, _finishedTasks);
        } else {
            return this[this.nextMove[_task.id]](_task);
        }
    }

    finish(_task, _activeTasks, _finishedTasks) {
        if (_task.tar.nextMove[_task.id] === 'finish'
            && _task.mit.nextMove[_task.id] == 'finish') {
            _finishedTasks.push(_task);
            var index = _activeTasks.indexOf(_task);
            if (index > -1) {
                _activeTasks.splice(index, 1);
            }
            console.log("[", _task.id, "]", this.constructor.name, "\t finishes");

            return Promise.resolve({
                activeTasks: _activeTasks,
                finishedTasks: _finishedTasks
            });
        } else {
            return Promise.resolve({});
        }
    }

    async complete(_taskId, _ctrs, _web3, _gasEstimate) {
        var receipt = Promise.resolve({});
        var startTime = _ctrs.mitgn.getStartTime(_taskId).toNumber();
        var ratingDeadline = startTime + _ctrs.mitgn.getRatingDeadline(_taskId).toNumber();

        if (_web3.eth.blockNumber > ratingDeadline) {
            var tx = _ctrs.mitgn.complete.sendTransaction(_taskId, _ctrs.rep.address, {from: this.addr, gas: _gasEstimate});
            console.log("[", _taskId, "]", this.constructor.name, "\t completes (final rating timeout)");
            receipt = await _web3.eth.getTransactionReceiptMined(tx);
            this.nextMove[_taskId] = 'finish';
        }

        return receipt;
    }
}

module.exports = Customer