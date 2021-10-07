/* 2018-2021 © lulula1 */

/*
 * Represents a draggable element
 *  @param element The draggable element
 *  @param options Several options to apply to the drag
 *    e.g (default values): {
 *      link: undefined,
 *      speedX: 1,
 *      speedY: 1,
 *      move: false,
 *      lockInBody: false,
 *      dragstart: undefined,
 *      drag: undefined,
 *      dragend: undefined
 *    }
 */

Drag.instances = [];
function Drag(elem, options) {
  if(elem == undefined)
    throw new Error('Element needs to be specified')

  let defaultOptions = {
    speedX: 1,
    speedY: 1,
    move: false,
    lockInBody: false
  },
  initDrag,
  moveLengthX,
  moveLengthY;

  Drag.instances.push(this);

  this.elem = elem;
  this.options = Object.assign(JSON.parse(JSON.stringify(defaultOptions)),
    options);
  this.dragstartLeft = undefined;
  this.dragstartTop = undefined;

  this.elem.style.cursor = 'move';

  this.destroy = function() {
    Drag.instances.splice(Drag.instances.indexOf(this.elem), 1);
  }

  let dragstart = ev => {
    if(Drag.dragging || ev.button != undefined && ev.button != 0) return;
    ev.preventDefault();
    if(ev.targetTouches)
      ev = ev.targetTouches[0];
    this.elem.classList.add('dragging');
    Drag.dragging = this;

    initDrag = {
      x: ev.pageX,
      y: ev.pageY,
      left: this.elem.getBoundingClientRect().left - (parseFloat(this.elem.style.left) || 0),
      top: this.elem.getBoundingClientRect().top - (parseFloat(this.elem.style.top) || 0)
    };
    this.pointerOffsetLeft = ev.pageX - this.elem.getBoundingClientRect().left;
    this.pointerOffsetTop  = ev.pageY - this.elem.getBoundingClientRect().top;

    moveLengthX = parseFloat(this.elem.style.left) || 0;
    moveLengthY = parseFloat(this.elem.style.top)  || 0;

    this.elem.style.position = 'relative';
    this.elem.style.pointerEvents = 'none';
    this.elem.style.zIndex = 2147483647;

    Drop.instances
      .filter(drop => drop.options.link === this.options.link)
      .map(drop => drop.elem.classList.add('droppable'));

    document.addEventListener('touchmove', drag, {passive: false});
    document.addEventListener('touchend', dragend);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragend);

    if(this.options.dragstart)
      this.options.dragstart.call(this, ev);
  }

  // @dragRequired
  // @touchEventRequired
  let drag = ev => {
    if(!Drag.dragging) return;  // @dragRequired
    ev.preventDefault();
    if(ev.targetTouches)  // @touchEventRequired
      ev = ev.changedTouches[0];

      let nextX = this.options.speedX * (ev.pageX - initDrag.x) + moveLengthX;
      let nextY = this.options.speedY * (ev.pageY - initDrag.y) + moveLengthY;

      if(this.options.lockInBody) {
        this.elem.style.left = Math.min(Math.max(
          -initDrag.left,
          nextX),
          document.body.offsetWidth - initDrag.left - this.elem.offsetWidth
          ) + 'px';
        this.elem.style.top = Math.min(Math.max(
          -initDrag.top,
          nextY),
          document.body.offsetHeight - initDrag.top - this.elem.offsetHeight
          ) + 'px';
      }else {
        this.elem.style.left = nextX + 'px';
        this.elem.style.top  = nextY + 'px';
      }

    if(this.options.drag)
      this.options.drag.call(this, ev);
  }

  // @touchEventRequired
  let dragend = ev => {
    ev.preventDefault();
    if(ev.targetTouches)  // @touchEventRequired
      ev = ev.changedTouches[0];
    this.elem.classList.remove('dragging');
    this.elem.style.pointerEvents = '';
    setTimeout(() => {
      Drag.dragging = undefined;
      if(this.options.move != true) {
        this.elem.style.position = '';
        this.elem.style.left = 0;
        this.elem.style.top = 0;
        this.elem.style.zIndex = '';
      }
    }, 50)

    Drop.instances
      .filter(drop => drop.options.link === this.options.link)
      .map(drop => drop.elem.classList.remove('droppable'));

    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', dragend);
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', dragend);

    if(this.options.dragend)
      this.options.dragend.call(this, ev);
  }

  // Touch
  elem.addEventListener('touchstart', dragstart, {passive: false});

  // Mouse drag
  elem.addEventListener('mousedown', dragstart);
}



/*
 * Represents a container where to drop a draggable
 *  @param element The element to drop into
 *  @param options Several options to apply to the drop
 *    e.g (default values): {
 *      link: undefined,
 *      dragenter: undefined,
 *      dragover: undefined,
 *      dragleave: undefined,
 *      drop: undefined
 *    }
 */

Drop.instances = [];
function Drop(elem, options) {
  if(elem == undefined)
    throw new Error('Element needs to be specified')

  let defaultOptions = {
  };
  this.elem = elem;
  this.options = Object.assign(JSON.parse(JSON.stringify(defaultOptions)),
    options);

  Drop.instances.push(this);

  this.destroy = function() {
    Drop.instances.splice(Drop.instances.indexOf(this.elem), 1);
  }
}

(() => {
  // @dragRequired
  Drop.fromPoint = function(x, y) {
    if(!Drag.dragging) return;  // @dragRequired

    let dropElems = Drop.instances.map(drop => drop.elem);
    elem = document.elementFromPoint(x, y);
    while(elem && dropElems.indexOf(elem) == -1 && elem != document.body)
      elem = elem.parentElement;
    if(dropElems.includes(elem))
      return dropElems[dropElems.indexOf(elem)];
    return undefined;
  };



  // @bindRequired
  function dragenter(ev) {
    if(Drag.dragging.options.link !== this.options.link) return;  // @bindRequired
    this.elem.classList.add('dragging-over');

    if(this.options.dragenter)
      this.options.dragenter.call(this, ev);
  }

  // @bindRequired
  function dragover(ev) {
    if(Drag.dragging.options.link !== this.options.link) return;  // @bindRequired

    if(!this.elem.classList.contains('dragging-over'))
      dragenter.call(this, ev);

    if(this.options.dragover)
      this.options.dragover.call(this, ev);
  }

  // @bindRequired
  function dragleave(ev) {
    if(Drag.dragging.options.link !== this.options.link) return;  // @bindRequired
    this.elem.classList.remove('dragging-over');

    if(this.options.dragleave)
      this.options.dragleave.call(this, ev);
  }

  // @bindRequired
  function drop(ev) {
    if(Drag.dragging.options.link !== this.options.link) return;  // @bindRequired
    this.elem.classList.remove('dragging-over');

    if(this.options.drop)
      this.options.drop.call(this, ev, Drag.dragging);

    Drag.dragging = undefined;
  }



  // @dragRequired
  // @touchEventRequired
  function doDragEvent(ev) {
    if(!Drag.dragging) return;  // @dragRequired
    if(ev.targetTouches)  // @touchEventRequired
      ev = ev.changedTouches[0];

    let hoveredDrop = Drop.instances
      .filter(drop => drop.elem == Drop.fromPoint(
        parseFloat(Drag.dragging.elem.getBoundingClientRect().left) + Drag.dragging.pointerOffsetLeft,
        parseFloat(Drag.dragging.elem.getBoundingClientRect().top)  + Drag.dragging.pointerOffsetTop))
      .pop();
    // Trigger dragleave on Drops that are no longer hovered and has drag class
    Drop.instances
      .filter(drop => (!hoveredDrop || drop.elem != hoveredDrop.elem)
        && drop.elem.classList.contains('dragging-over'))
      .map(drop => dragleave.call(drop, ev));
    // Trigger dragover on the Drop that is hovered
    if(hoveredDrop)
      dragover.call(hoveredDrop, ev);
  }

  // @dragRequired
  // @touchEventRequired
  function doDropEvent(ev) {
    if(!Drag.dragging) return;  // @dragRequired
    if(ev.targetTouches)  // @touchEventRequired
      ev = ev.changedTouches[0];

    let hoveredDrop = Drop.instances
      .filter(drop => drop.elem == Drop.fromPoint(
        parseFloat(Drag.dragging.elem.getBoundingClientRect().left) + Drag.dragging.pointerOffsetLeft,
        parseFloat(Drag.dragging.elem.getBoundingClientRect().top)  + Drag.dragging.pointerOffsetTop))
      .pop();
    // Trigger drop on the Drop that has been dropped into
    if(hoveredDrop)
      drop.call(hoveredDrop, ev);
  }

  document.addEventListener('touchmove', doDragEvent);
  document.addEventListener('mousemove', doDragEvent);

  document.addEventListener('touchend', doDropEvent);
  document.addEventListener('mouseup',  doDropEvent);
})();