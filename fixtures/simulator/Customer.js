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

    advance(_task, _activeTasks, _completedTasks) {
        if (typeof this.nextMove[_task.id] === 'undefined') {
            this.nextMove[_task.id] = 'init';
            return Promise.resolve({});
        } else if (this.nextMove[_task.id] === 'complete') {
            return this.complete(_task, _activeTasks, _completedTasks);
        } else {
            return this[this.nextMove[_task.id]](_task);
        }
    }

    complete(_task, _activeTasks, _completedTasks) {
        if (_task.tar.nextMove[_task.id] === 'complete'
            && _task.mit.nextMove[_task.id] == 'complete') {
            _completedTasks.push(_task);
            var index = _activeTasks.indexOf(_task);
            if (index > -1) {
                _activeTasks.splice(index, 1);
            }
            console.log("[", _task.id, "]", this.constructor.name, "\t completes");

            return Promise.resolve({
                activeTasks: _activeTasks,
                completedTasks: _completedTasks
            });
        } else {
            return Promise.resolve({});
        }
    }

    async abort(_taskId, _ctr, _web3, _gasEstimate) {
        var receipt = Promise.resolve({});
        var startTime = _ctr.getStartTime(_taskId).toNumber();
        var validationDeadline = startTime + _ctr.getValidationDeadline(_taskId).toNumber();

        if (_web3.eth.blockNumber > validationDeadline) {
            var tx = _ctr.abort.sendTransaction(_taskId, {from: this.addr, gas: _gasEstimate});
            console.log("[", _taskId, "]", this.constructor.name, "\t aborts (validation timeout)");
            receipt = await _web3.eth.getTransactionReceiptMined(tx);
            this.nextMove[_taskId] = 'complete';
        }

        return receipt;
    }
}

module.exports = Customer