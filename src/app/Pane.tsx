import type { ReactNode } from 'react'

/** A framed part of a window, with its title on a tab. */
function Pane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pane">
      <h4 className="pane-tab">{title}</h4>
      <div className="pane-body">{children}</div>
    </section>
  )
}

export default Pane
