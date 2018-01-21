const defaults = {
    addr: "0x",
    id: 0
}

class Customer {
    constructor(_options) {
        this.addr = _options.addr || defaults.addr;
        this.id = _options.id || defaults.id;
        this.nextMove = 'complete';
    }

    advance(_task, _activeTasks, _completedTasks) {
        if (this.nextMove === 'complete') {
            var tasks = this.complete(_task, _activeTasks, _completedTasks);
            return Promise.resolve(tasks);
        } else {
            return this[this.nextMove](_task);
        }
    }

    complete(_task, _activeTasks, _completedTasks) {
        var startTime = ctr.mitgn.getStartTime(_task.id).toNumber();
        var validationDeadline = startTime + ctr.mitgn.getValidationDeadline(_task.id).toNumber();
        if (_task.tar.nextMove === 'completed'
            && _task.mit.nextMove == 'completed') {
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
}

module.exports = Customer