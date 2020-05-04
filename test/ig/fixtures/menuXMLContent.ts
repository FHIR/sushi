export const simpleMenuXMLContent = `
<ul xmlns=\"http://www.w3.org/1999/xhtml\" class=\"nav navbar-nav\">
  <li>
    <a href="animals.html">Animals</a>
  </li>
  <li>
    <a href="plants.html">Plants</a>
  </li>
  <li>
    Other
  </li>
</ul>`;

export const subMenuXMLContent = `
<ul xmlns="http://www.w3.org/1999/xhtml" class="nav navbar-nav">
  <li>
    <a href="animals.html">Animals</a>
  </li>
  <li class="dropdown">
    <a data-toggle="dropdown" href="#" class="dropdown-toggle">Plants
      <b class="caret"></b>
    </a>
    <ul class="dropdown-menu">
      <li>
        <a href="plants.html#trees">Trees</a>
      </li>
      <li>
        <a href="buds.html">Flowers</a>
      </li>
    </ul>
  </li>
</ul>`;

export const subMenuWithWarningXMLContent = `
<ul xmlns="http://www.w3.org/1999/xhtml" class="nav navbar-nav">
  <li>
    <a href="animals.html">Animals</a>
  </li>
  <li class="dropdown">
    <a data-toggle="dropdown" href="#" class="dropdown-toggle">Plants
      <b class="caret"></b>
    </a>
    <ul class="dropdown-menu">
      <li>
        <a href="plants.html#trees">Trees</a>
      </li>
      <li class="dropdown">
        <a data-toggle="dropdown" href="#" class="dropdown-toggle">Flowers
          <b class="caret"></b>
        </a>
        <ul class="dropdown-menu">
          <li>
            <a href="buds.html#roses">Roses</a>
          </li>
          <li>
            Tulips
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`;
