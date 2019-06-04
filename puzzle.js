'use strict';

class Puzzle {
  constructor(options) {
    this.host = options.host;
    this.croppie = false;
    this.resizeTimer = false;
    this.selectedItem = false;
    this.puzzleCreated = false;

    this.initDom();
    this.initEvents();

    this.cellsCount = {
      x: 16,
      y: 9,
    };
    this.dom.sliderHorizontal.val(this.cellsCount.x);
    this.dom.sliderVertical.val(this.cellsCount.y);
    this.dom.cellCountHorizontal.html(this.cellsCount.x);
    this.dom.cellCountVertical.html(this.cellsCount.y);
  }


  initDom() {
    this.dom = {
      barBottom: this.host.find('.bar-bottom').hide(),
      barLeft: this.host.find('.bar-left').hide(),
      buttonDone: this.host.find('.button-done'),
      buttonUpload: this.host.find('.button-upload'),
      cellCountHorizontal: this.host.find('.cell-count-horizontal'),
      cellCountVertical: this.host.find('.cell-count-vertical'),
      croppieWrapper: this.host.find('.croppie-wrapper'),
      imageFull: this.host.find('.image-full img').hide(),
      imagePuzzle: this.host.find('.image-puzzle').hide(),
      menu: this.host.find('.menu'),
      menuButton: this.host.find('.menu-button').hide(),
      overlay: this.host.find('.overlay').hide(),
      puzzleGrid: this.host.find('.puzzle-grid').hide(),
      sliderHorizontal: this.host.find('#sliderHorizontal'),
      sliderVertical: this.host.find('#sliderVertical'),
      uploadField: this.host.find('#puzzleUpload'),
    };
  }


  createCroppie() {
    let result = false;

    if (this.croppie) {
      this.croppie.destroy();
      this.croppie = false;
      this.dom.puzzleGrid.hide();
    }

    if (this.imageUrl) {
      const { height, width } = this.getSizes();

      this.croppie = new Croppie(this.dom.croppieWrapper[0], {
        viewport: { width, height },
      });

      result = this.croppie.bind({ url: this.imageUrl });

      if (result) {
        this.createPuzzleGrid({ height, width });
        this.dom.puzzleGrid.show();
      }
    }

    return result;
  }


  createItems(img) {
    const { height, width } = this.getSizes();
    const size = {
      height: height / this.cellsCount.y,
      width: width / this.cellsCount.x,
    };

    this.dom.imagePuzzle
      .empty()
      .css({ height, width });

    const positions = [];
    _.range(this.cellsCount.y).forEach(indexY =>
      _.range(this.cellsCount.x).forEach(indexX => positions.push([indexY, indexX]))
    );
    let shuffledPositions = _.shuffle(positions);

    while (shuffledPositions.some((pos, i) => pos === positions[i])) {
      shuffledPositions = _.shuffle(positions);
    }

    shuffledPositions.forEach((pos, index) => {
      const colVal = pos[1];
      const rowVal = pos[0];
      const colIndex = index % this.cellsCount.x;
      const rowIndex = Math.floor(index / this.cellsCount.x);

      const itemCss = {
        left: colVal * size.width,
        top: rowVal * size.height,
        ...size,
      };
      const item = $('<div class="item active"></div>')
        .addClass(`row-${rowVal} col-${colVal}`)
        .appendTo(this.dom.imagePuzzle)
        .css(itemCss)
        .data({
          currentIndex: [rowVal, colVal],
          correctIndex: [rowIndex, colIndex]
        });
      const buffer = document.createElement('canvas');
      buffer.width = size.width;
      buffer.height = size.height;
      const ctx = buffer.getContext('2d');
      const imgOffset = {
        x: colIndex * size.width,
        y: rowIndex * size.height,
      };
      ctx.drawImage(img, imgOffset.x, imgOffset.y, size.width, size.height, 0, 0, size.width, size.height);
      item.append(`<img src="${buffer.toDataURL()}">`);
    });

    this.dom.imagePuzzle.show();
    this.dom.menuButton.show();

    this.dom.imagePuzzle.find('.item.active').on('click', event => {
      this.itemClick($(event.currentTarget));
    });
  }


  createPuzzle(src) {
    this.dom.puzzleGrid.hide();
    this.dom.barBottom.hide();
    this.dom.barLeft.hide();
    this.dom.buttonUpload.appendTo(this.dom.menu);
    this.croppie.destroy();
    this.croppie = false;
    this.dom.croppieWrapper.empty();
    this.puzzleCreated = true;

    const { height, width } = this.getSizes();
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      this.createItems(img);
    };
    img.src = src;

    this.dom.imageFull
      .css({ height, width })
      .attr({ src });
  }


  createPuzzleGrid({ height, width }) {
    this.dom.puzzleGrid
      .empty()
      .css({ height, width });

    const table = $('<table></table>').appendTo(this.dom.puzzleGrid);
    _.range(this.cellsCount.y).forEach(() => {
      const row = $('<tr></tr>').appendTo(table);
      _.range(this.cellsCount.x).forEach(() => {
        $('<td></td>').appendTo(row);
      });
    });
  }


  getSizes() {
    const wrapperHeight = this.dom.croppieWrapper.height();
    const height = wrapperHeight - (wrapperHeight % this.cellsCount.y);
    const wrapperWidth = this.dom.croppieWrapper.width();
    const width = wrapperWidth - (wrapperWidth % this.cellsCount.x);
    return { height, width };
  }


  initEvents() {
    $(window).on('resize', () => {
      if (this.puzzleCreated) return;

      this.dom.puzzleGrid.empty();
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.createCroppie();
      }, 300);
    });

    $(document).on('keypress', event => {
      if (!this.puzzleCreated) return;

      if (event.which === 102) {
        this.dom.imageFull.toggle();
      }
    });

    this.dom.menuButton.on('click', () => {
      this.toggleMenu();
    });

    this.dom.uploadField.on('change', () => {
      const uploadPromise = this.uploadFile();
      if (uploadPromise) {
        uploadPromise.then(result => {
          this.imageUrl = result;
          const createPromise = this.createCroppie();
          if (createPromise) {
            createPromise.then(() => {
              this.dom.menu.removeClass('show');
              this.dom.menuButton.hide();
              this.dom.overlay.hide();
              this.dom.imageFull.hide();
              this.dom.imagePuzzle.hide();
              this.dom.buttonUpload.appendTo(this.dom.barBottom);
              this.dom.barBottom.show();
              this.dom.barLeft.show();
            });
          }
        });
      }
    });

    this.dom.sliderHorizontal.on('input', () => {
      const value = this.dom.sliderHorizontal.val();
      this.dom.cellCountHorizontal.html(value);
      this.cellsCount.x = value;
      this.createPuzzleGrid({
        height: this.dom.puzzleGrid.height(),
        width: this.dom.puzzleGrid.width(),
      });
    });

    this.dom.sliderHorizontal.on('change', () => {
      const value = this.dom.sliderHorizontal.val();
      this.dom.cellCountHorizontal.html(value);
      this.cellsCount.x = value;
      this.createCroppie();
    });

    this.dom.sliderVertical.on('input', () => {
      const value = this.dom.sliderVertical.val();
      this.dom.cellCountVertical.html(value);
      this.cellsCount.y = value;
      this.createPuzzleGrid({
        height: this.dom.puzzleGrid.height(),
        width: this.dom.puzzleGrid.width(),
      });
    });

    this.dom.sliderVertical.on('change', () => {
      const value = this.dom.sliderVertical.val();
      this.dom.cellCountVertical.html(value);
      this.cellsCount.y = value;
      this.createCroppie();
    });

    this.dom.buttonDone.on('click', () => {
      this.croppie.result({
        type: 'base64',
        size: 'viewport',
      }).then(resp => {
        this.createPuzzle(resp);
      });
    });
  }


  itemClick(currentItem) {
    if (this.selectedItem) {
      this.selectedItem.removeClass('selected');
      const { left, top } = this.selectedItem.position();
      const selectedIndex = this.selectedItem.data().currentIndex;
      this.selectedItem.css({
        left: currentItem.position().left,
        top: currentItem.position().top,
      });
      currentItem.css({ left, top });
      this.selectedItem.data({
        currentIndex: currentItem.data().currentIndex,
      });
      currentItem.data({
        currentIndex: selectedIndex,
      });
      if (_.isEqual(currentItem.data().currentIndex, currentItem.data().correctIndex)) {
        currentItem.removeClass('active').off();
      }
      if (_.isEqual(this.selectedItem.data().currentIndex, this.selectedItem.data().correctIndex)) {
        this.selectedItem.removeClass('active').off();
      }
      this.selectedItem = false;

      /* if (this.dom.imagePuzzle.find('.item.active').length === 0) {
      } */
    } else {
      this.selectedItem = currentItem;
      currentItem.addClass('selected');
    }
  }


  toggleMenu() {
    this.dom.overlay.toggle();
    this.dom.menu.toggleClass('show');
  }


  uploadFile() {
    const input = this.dom.uploadField[0];

    if (input.files && input.files[0]) {
      this.puzzleCreated = false;
    } else {
      return false;
    }

    return new Promise(res => {
      const reader = new FileReader();
      reader.onload = () => {
        res(reader.result);
      };
      reader.readAsDataURL(input.files[0]);
    });
  }
}

