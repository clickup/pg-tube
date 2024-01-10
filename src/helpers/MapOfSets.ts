/**
 * A generic pattern of having a map of grouped members.
 */
export default class MapOfSets<TGroup, TMember> extends Map<
  TGroup,
  Set<TMember>
> {
  add(group: TGroup, member: TMember): void {
    const set = this.get(group) ?? new Set<TMember>();
    if (set.size === 0) {
      this.set(group, set);
    }

    set.add(member);
  }
}
