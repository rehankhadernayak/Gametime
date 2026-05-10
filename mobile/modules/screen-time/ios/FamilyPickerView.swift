import ExpoModulesCore
import FamilyControls
import SwiftUI

// MARK: - SwiftUI

@available(iOS 15.0, *)
private struct FamilyPickerSwiftUIView: View {
  @State private var selection = FamilyActivitySelection()
  let onEncodedSelection: (String) -> Void

  var body: some View {
    FamilyActivityPicker(selection: $selection)
      .onChange(of: selection, perform: { newValue in
        let encoder = JSONEncoder()
        guard let data = try? encoder.encode(newValue),
              let json = String(data: data, encoding: .utf8) else {
          return
        }
        onEncodedSelection(json)
      })
  }
}

// MARK: - Expo view

/**
 Embeds Apple's `FamilyActivityPicker` and forwards `FamilyActivitySelection` as JSON when the binding changes
 (including when the parent finishes choosing apps and the selection is finalized).
 */
public final class FamilyPickerView: ExpoView {
  public let onSelectionChange = EventDispatcher()

  private var hostingController: UIViewController?

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()

    guard #available(iOS 15.0, *) else {
      return
    }

    if window != nil {
      mountHostingControllerIfNeeded()
    } else {
      unmountHostingController()
    }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }

  @available(iOS 15.0, *)
  private func mountHostingControllerIfNeeded() {
    guard hostingController == nil else {
      return
    }

    let rootView = FamilyPickerSwiftUIView { [weak self] json in
      self?.onSelectionChange([
        "encodedSelection": json
      ])
    }

    let host = UIHostingController(rootView: rootView)
    host.view.backgroundColor = .clear
    if #available(iOS 16.0, *) {
      host.sizingOptions = [.intrinsicContentSize]
    }

    hostingController = host

    if let parent = reactViewController() {
      parent.addChild(host)
      addSubview(host.view)
      host.didMove(toParent: parent)
    } else {
      addSubview(host.view)
    }

    host.view.frame = bounds
  }

  private func unmountHostingController() {
    guard let host = hostingController else {
      return
    }
    host.willMove(toParent: nil)
    host.view.removeFromSuperview()
    host.removeFromParent()
    hostingController = nil
  }
}

// MARK: - Expo module

public final class ScreenTimeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GametimeScreenTime")

    View(FamilyPickerView.self) {
      Events("onSelectionChange")
    }
  }
}
