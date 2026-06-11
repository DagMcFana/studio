const width = 1700
const height = 850
const scale_factor = 1

class Pixel {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.color = color
  }

  static scale(x) {
    return x * scale_factor
  }

  draw(o) {
    o.rect(Pixel.scale(1), Pixel.scale(1)).move(Pixel.scale(this.x), Pixel.scale(this.y)).fill(this.color)
  }

}

class Pixmap {


  constructor(m) {
    this.pixmap = m
    this.svg = Pixmap.svg(m)
  }

  static svg(m) {
    const draw = SVG()

    for (let i = 0; i < m.length; i++) {
      for (let j = 0; j < m[i].length; j++) {
        if (m[i][j] != '') {
          let px = new Pixel(j, i, m[i][j])
          px.draw(draw)
        }
      }
    }

    const img = new Image()
    img.src = "data:image/svg+xml;base64," + btoa(draw.svg())

    return img
  }

  flip() {
    return new Pixmap(this.pixmap.map(element => element.reverse()))
  }

  draw(ctx, x, y) {
        ctx.drawImage(this.svg, Pixel.scale(x), Pixel.scale(height - y));

/*
    ctx.save()
    ctx.translate(Pixel.scale(x), Pixel.scale(height - y))
    ctx.rotate(angle)
    let w = this.pixmap[0].length
    let h = this.pixmap.length
    ctx.drawImage(this.svg, -this.svg.naturalWidth/2 , -this.svg.naturalHeight/2,
        this.svg.naturalWidth/2, this.svg.naturalHeight/2);
    ctx.restore()
    */
  }
}
