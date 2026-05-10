import ExpoModulesCore
import FamilyControls
import SwiftUI
import UIKit

@available(iOS 16.0, *)
private final class SelectionHolder: ObservableObject {
  @Published var selection = FamilyActivitySelection()
  var onEncoded: ((String) -> Void)?

  func emitSelectionEncoded() {
    do {
      let data = try JSONEncoder().encode(selection)
      let string = String(data: data, encoding: .utf8) ?? ""
      onEncoded?(string)
    } catch {
      onEncoded?("")
    }
  }
}

@available(iOS 16.0, *)
private struct FamilyActivityPickerHost: View {
  @ObservedObject var holder: SelectionHolder

  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $holder.selection)
        .navigationTitle("Select apps")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button("Done") {
              holder.emitSelectionEncoded()
            }
          }
        }
    }
  }
}

final class FamilyPickerContainerView: ExpoView {
  let onSelectionChange = EventDispatcher()

  private var hostingController: UIHostingController<FamilyActivityPickerHost>?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    if #available(iOS 16.0, *) {
      let holder = SelectionHolder()
      holder.onEncoded = { [weak self] encoded in
        self?.onSelectionChange([
          "selectionData": encoded
        ])
      }
      let host = FamilyActivityPickerHost(holder: holder)
      let controller = UIHostingController(rootView: host)
      controller.view.backgroundColor = .clear
      hostingController = controller

      let hostedView = controller.view!
      hostedView.translatesAutoresizingMaskIntoConstraints = false
      addSubview(hostedView)
      NSLayoutConstraint.activate([
        hostedView.topAnchor.constraint(equalTo: topAnchor),
        hostedView.bottomAnchor.constraint(equalTo: bottomAnchor),
        hostedView.leadingAnchor.constraint(equalTo: leadingAnchor),
        hostedView.trailingAnchor.constraint(equalTo: trailingAnchor)
      ])
    }
  }
}
