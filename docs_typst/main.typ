#import "@preview/fletcher:0.5.1"
#import "@preview/chronos:0.1.0"


#set page(width: auto, height: auto)
= Dyson Swarm Builder Internal Logic

== Structure

#fletcher.diagram(spacing: (4cm, 2cm), {
    import fletcher: *
    node((1,0), "App", name:<App>)
    node((1,1), "Simulation", name:<Sim>)
    node((1,2), "Processors", name:<Procs>)
    node((2,2), "Events", name: <Events>)

    edge(<App>, <Sim>, "->", label: "instantiates, saves, and loads")
    edge(<Sim>, <Procs>, "->", label: "feeds events / schedules for processing")
    edge(<Sim>, <Events>, "->", label: "stores and delivers")
    edge(<Procs>, <Events>, "->", label: "emits and receives")
})

== Sequences

#context {
    let sequences = query(
        selector(heading).after(here()),
    )
    for seq in sequences {
        list(seq.body)
    }
}

#set page(width: auto, height: auto)

=== Starting a new game/sim

#let delegate(from, to, task) = {
    chronos._seq(from, to, comment: task, comment-align: "right")
}

#let loadTitleInBrowser() = {
    chronos._seq("User", "App", comment: "Loads page in browser", create-dst: true, enable-dst: true)
    chronos._seq("App", "App store", comment: `makeAppStateStore(settings)`, create-dst: true, enable-dst: true)
    chronos._seq("App store", "App", dashed: true, disable-src: true)
    chronos._seq("App", "App", comment: "render title menu")
    chronos._seq("App", "User", dashed: true, comment: "cede control back to user", comment-align: "right", disable-src: true)
}

#let startNewSimFromTitle() = {
    chronos._seq("User", "App", comment: "clicks 'new sim'", enable-dst: true)
    chronos._seq("App", "App store", comment: `.startNewSim(showIntro)`, enable-dst: true)
    chronos._seq("App store", "Adapters", comment: "initializes", create-dst: true)
    chronos._seq("Adapters", "App store", dashed: true)
    chronos._seq("App store", "Sim store", comment: `makeSimulationStore(adapters)`, create-dst: true)
    chronos._seq("App store", "Sim store", comment: `.loadNew()`, enable-dst: true)

    chronos._grp(`for proc in newGame()`, {
        chronos._grp(`insertProcessor(proc)`, {
            chronos._seq("Sim store", "Adapters", comment: `eventSources.insertSource(id)`)
            chronos._seq("Sim store", "Adapters", comment: `snapshots.persistSnapshot(lastTick, id, data)`)
        })

        chronos._seq("Sim store", "Sim store", comment: "update simulation subscriptions for proc")
    })
    chronos._seq("Sim store", "App store", dashed: true, disable-src: true)
    chronos._seq("App store", "App", dashed: true, disable-src: true)
    chronos._seq("App", "App", comment: "render simulation viewer")
    chronos._seq("App", "User", dashed: true, comment: "cede control back to user", comment-align: "right", disable-src: true)
}

#chronos.diagram({
    import chronos: *
    _par("User")
    _par("App", display-name: "Component Code")
    _par("App store")
    _par("Sim store")
    _par("Adapters")

    loadTitleInBrowser()

    startNewSimFromTitle()

})

#pagebreak()

=== Loading an Existing Game from the title


#chronos.diagram({
    import chronos: *
    _par("User")
    _par("App", display-name: "Component code")
    _par("App store")
    _par("Sim store")
    _par("Adapters")
    _par("Save.ts", display-name: "save utils")

    loadTitleInBrowser()

    _seq("User", "App", comment: "clicks 'load sim'", enable-dst: true)
    _seq("App", "App store", comment: `.openSave()`, comment-align: "right", enable-dst: true)
    _seq("App store", "App", dashed: true, disable-src: true)
    _seq("App", "App", comment: "render save slots")
    _seq("App", "User", dashed: true, comment: "cede control back to user", comment-align: "right", disable-src: true)

    _seq("User", "App", comment: "selects a save slot containing an existing game and clicks 'load'", enable-dst: true)
    _seq("App", "Save.ts", comment: `readsaveStateFromStorage(name)`, comment-align: "right",)
    _seq("Save.ts", "App", dashed: true, comment: `success`)
    _seq("App", "App store", comment: `.loadExistingSim(saveState)`, disable-src: true, enable-dst: true)
    _seq("App store", "Adapters", comment: "initializes", create-dst: true)
    _seq("App store", "Sim store", comment: `makeSimulationStore(adapters)`, create-dst: true)
    _seq("App store", "Sim store", comment: `.loadSave(saveState)`, comment-align: "right", enable-dst: true)

    _grp(`for id, tag in saveState.sources`, {
        _seq("Sim store", "Sim store", comment: "update simulation subscriptions for proc")
        delegate("Sim store", "Adapters", `eventSources.insertSource(id)`)
        delegate("Sim store", "Adapters", `snapshots.persistSnapshot(lastTick, id, data)`)
    })

    _grp(`for event in saveState.events`, {
        delegate("Sim store", "Adapters", `events.write.persistEvent(event)`)
    })

    _grp(`for sourceId, events in saveState.inboxes`, {
        _grp(`for event in events`, {
            delegate("Sim store", "Adapters", `events.write.deliverEvent(event, sourceId)`)
        })
    })

    _seq("Sim store", "App store", dashed: true, disable-src: true)
    _seq("App store", "App", dashed: true, disable-src: true, enable-dst: true)
    _seq("App", "App", comment: "render confirmation dialogue")
    _seq("App", "User", dashed: true, comment: "cede control back to user", comment-align: "right", disable-src: true)
    _seq("User", "App", comment: "clicks 'confirm'", enable-dst: true)
    _seq("App", "App", comment: "render Simulation view")
    _seq("App", "User", dashed: true, comment: "cede control back to user", comment-align: "right", disable-src: true)
})

#pagebreak()

=== Opening the settings

#chronos.diagram({
    import chronos: *
    _par("User")
    _par("App", display-name: "Compenent Code")
    _par("App store")

    loadTitleInBrowser()

    _seq("User", "App", comment: "clicks 'settings'", enable-dst: true)
    _seq("App", "App store", comment: `openSettings()`)
    _seq("App store", "App", dashed: true)
    _seq("App", "App", comment: "render Settings menu")
    _seq("App", "User", dashed: true, comment: "cede control back to user", comment-align: "right", disable-src: true)
})

#pagebreak()

=== Saving a running Game

#chronos.diagram({
    import chronos: *

    // enforce order
    _par("User")
    _par("App", display-name: "Compenent Code")

    loadTitleInBrowser()

    startNewSimFromTitle()

    _seq("User", "App", comment: "clicks 'menu'", comment-align: "right", enable-dst: true)
    _seq("App", "App", comment: "render simulation menu")
    _seq("App", "User", dashed: true, comment: "cede control back to user", comment-align: "right", disable-src: true)
})
